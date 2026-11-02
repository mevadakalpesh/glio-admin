import {DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from "@/components/ui/dialog";
import {FilterBuilder} from "@/components/ui/filter-builder";
import { SegmentedControl, SegmentedItem } from "@/components/ui/segmented-control";
import {AdminTable} from '@/components/ui/admin-table';
import {Input} from '@/components/ui/input';
import {VerificationHistory} from "./VerificationHistory";
import {VerificationDecision} from "./VerificationDecision";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RefreshCw, ShieldCheck, X, MoreHorizontal, CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRead } from "./useRead";
import { useAuth } from "./useAuth";
import { fetchEvidence } from "./evidence";
type Evidence = {
  id: string;
  user_id: string;
  document_type?: string;
  review_revision?: string;
  manual_review?: {status:string;reviewed_at:string|null;expires_on:string|null};
  verification_status?: string;
  verified_at?: string;
  reference: string | null;
  created_at: string;
  updated_at: string;
  evidence: { side: string; available: boolean; revision: string }[];
};
type Listing = { items: Evidence[]; total: number; page: number };
const title = (v: string) =>
  v.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
const time = (v?: string) =>
  v && !Number.isNaN(new Date(v).getTime())
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(new Date(v))
    : "Not recorded";
type VerificationProps = {personId?: string; category?: "documents" | "selfies" | "vehicles"};
export function Verification({personId, category}: VerificationProps = {}) {
  const { session } = useAuth();
  return session?.staff.permissions.includes("verification.read") ? (
    <Queue key={session.staff.id + ":" + session.staff.role + (personId || "")} personId={personId} category={category} />
  ) : (
    <Card>
      <CardContent className="p-6">
        Your role does not include verification inspection.
      </CardContent>
    </Card>
  );
}
function Queue({personId, category}: VerificationProps) {
  const { session } = useAuth();
  const identityAccess = session?.staff.role === "owner";
  const [guidance, setGuidance] = useState(false);
  const [reviewing, setReviewing] = useState<Evidence | null>(null);
  const [routeParams, setRouteParams] = useSearchParams();
  const [localParams, setLocalParams] = useState(new URLSearchParams());
  const params = personId ? localParams : routeParams;
  const setParams = personId ? setLocalParams : setRouteParams;
  const [version, setVersion] = useState(0),
    [selected, setSelected] = useState<{
      record: Evidence;
      side: string;
    } | null>(null);
  const kind = (identityAccess ? ["documents", "selfies", "vehicles"] : ["vehicles"]).includes(
    category || params.get("kind") || "",
  )
    ? category || params.get("kind")!
    : identityAccess ? "documents" : "vehicles";
  const query = new URLSearchParams();
  for (const k of ["person", "status", "page"])
    if (params.get(k) && (k !== "status" || kind !== "vehicles")) query.set(k, params.get(k)!);
  if (personId) query.set("person", personId);
  const result = useRead<Listing>(`/verification/${kind}?${query}`, version);
  const update = (values: Record<string, string | null>) => {
    setSelected(null);
    setReviewing(null);
    setParams(previous => {
    const next = new URLSearchParams(previous);
    for (const [k, v] of Object.entries(values)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    return next;
    });
  };
  return (
    <>
      <div className="mb-4 flex justify-between gap-4">
        {!personId && <div>
          <p className="mb-2 flex items-center gap-2 text-xs text-emerald-700">
            <ShieldCheck size={15} />
            Manual document review
          </p>
          <h2 className="text-2xl font-semibold">{personId ? "Documents & verification" : "Verification"}</h2>
          <p className="mt-2 text-sm text-slate-500">
            Inspect evidence and record manual decisions. Provider verification
            and journey eligibility remain separate.
          </p>
        </div>}
        <div className="ml-auto flex shrink-0 items-start gap-2"><Button variant="outline" size="icon" aria-label="Document review guidance" onClick={()=>setGuidance(true)}><CircleHelp size={17}/></Button><Button
          variant="outline"
          onClick={() => {
            setSelected(null);
    setReviewing(null);
            setVersion((v) => v + 1);
          }}
        >
          <RefreshCw size={15} />
          Refresh
        </Button></div>
      </div>
      {!category && <SegmentedControl aria-label="Verification categories" className="mb-5">
        {[
          ["documents", "Identity documents"],
          ["selfies", "Selfies"],
          ["vehicles", "Vehicle & licence uploads"],
        ].filter(([value]) => identityAccess || value === "vehicles").map(([value, label]) => (
          <SegmentedItem
            key={value}
            
            aria-pressed={value === kind}
            onClick={() => update({ kind: value, status: null, page: null })}
          >
            {label}
          </SegmentedItem>
        ))}
      </SegmentedControl>}
      <Dialog open={guidance} onOpenChange={setGuidance}><DialogContent><DialogTitle>Document review guidance</DialogTitle><DialogDescription>Review evidence before recording a decision.</DialogDescription><p className="text-sm leading-6 text-muted-foreground">Manual decisions and provider statuses are separate. Open each available image and check that it belongs to the customer. Image access requires a reason and is audited. Replacement evidence needs a new review.</p></DialogContent></Dialog>
      {selected && (
        <Dialog open onOpenChange={open=>{if(!open)setSelected(null);}}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogTitle>Protected evidence</DialogTitle><DialogDescription>Review the uploaded image for this record.</DialogDescription><EvidenceViewer
          key={selected.record.id + selected.side + kind}
          kind={kind}
          record={selected.record}
          side={selected.side}
          onClose={() => setSelected(null)}
        /></DialogContent></Dialog>
      )}
      {reviewing?.review_revision && (
        <Dialog open onOpenChange={open=>{if(!open)setReviewing(null);}}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogTitle>Document review</DialogTitle><DialogDescription>Record a decision against the current evidence.</DialogDescription><Card className="border-0 shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Review · {reviewing.reference || title(reviewing.document_type || 'Selfie')}</h2>
              <Button variant="ghost" aria-label="Close review" onClick={()=>setReviewing(null)}><X size={18}/></Button>
            </div>
            <p className="mt-2 break-all text-xs text-slate-500">Record {reviewing.id}</p>
            <VerificationDecision key={kind+reviewing.id+reviewing.review_revision} kind={kind} id={reviewing.id} revision={reviewing.review_revision} requiresExpiry={kind==='vehicles'||['driving_license','passport'].includes(reviewing.document_type||'')} onDone={()=>{setSelected(null);setReviewing(null);setVersion(v=>v+1);}}/>
            <div className="mt-6 border-t pt-6"><VerificationHistory kind={kind} id={reviewing.id}/></div>
          </CardContent>
        </Card></DialogContent></Dialog>
      )}
      {!result && (
        <p role="status" className="rounded-lg border bg-white p-6">
          Loading evidence records…
        </p>
      )}
      {result?.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-5 text-red-800">
          {result.error}
        </p>
      )}
      <>
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <AdminTable className="w-full text-left text-sm" toolbar={<FilterBuilder fields={[
            ...(!personId ? [{key:'person',label:'Account ID',value:params.get('person')||'',operator:'is'}] : []),
            ...(kind !== 'vehicles' ? [{key:'status',label:'Recorded status',value:params.get('status')||'',options:['pending','verified','approved','rejected'].map(value=>({value,label:title(value)}))}] : [])
          ]} onChange={values=>update({...Object.fromEntries(Object.entries(values).map(([key,value])=>[key,value||null])),page:null})}/>}>
                <thead className="border-b bg-slate-50 text-xs text-slate-500">
                  <tr>
                    {[
                      "Record",
                      "Account",
                      "Review status",
                      "Record created (IST)",
                      "Actions",
                    ].map((h) => (
                      <th key={h} className="p-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(result?.data?.items || []).map((record) => (
                    <tr key={record.id} className="border-b last:border-0">
                      <td className="p-4">
                        <p className="font-semibold">
                          {record.reference ||
                            title(record.document_type || "Selfie")}
                        </p>
                        <p className="mt-1 max-w-44 break-all text-xs text-slate-500">
                          {record.id}
                        </p>
                      </td>
                      <td className="p-4">
                        {session?.staff.permissions.includes("people.read") ? <Link
                          className="break-all text-xs text-emerald-700 underline"
                          to={`/people?id=${record.user_id}`}
                        >
                          {record.user_id}
                        </Link> : <span className="break-all text-xs text-slate-500">{record.user_id}</span>}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className={record.manual_review?.status === "approved" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}>{title(record.manual_review?.status || "not_reviewed")}</Badge>
                        {record.manual_review?.expires_on && <p className="mb-2 text-xs">Expires {record.manual_review.expires_on}</p>}
                        {record.verification_status && <p className="mt-2 text-xs text-muted-foreground">Provider: {title(record.verification_status)}</p>}
                        {record.verified_at && (
                          <p className="mt-2 text-xs text-slate-500">
                            Provider/legacy verification: {time(record.verified_at)}
                          </p>
                        )}
                        
                      </td>
                      <td className="whitespace-nowrap p-4">
                        {time(record.created_at)}
                        <p className="mt-1 text-xs text-slate-500">
                          Updated {time(record.updated_at)}
                        </p>
                      </td>
                      <td className="p-4">
                        <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions for ${record.reference || record.document_type || 'Selfie'}`}/>}><MoreHorizontal size={18}/></DropdownMenuTrigger><DropdownMenuContent><p className="px-3 py-2 text-xs text-muted-foreground">Evidence & review</p>
                        {record.evidence.map(e=><DropdownMenuItem key={e.side} disabled={!e.available || !session?.staff.permissions.includes('verification.evidence.read')} onClick={()=>setSelected({record,side:e.side})}>{e.available ? `View ${title(e.side)}` : `${title(e.side)} not uploaded`}</DropdownMenuItem>)}
                        {record.review_revision && <DropdownMenuItem onClick={()=>setReviewing(record)}>{session?.staff.permissions.includes('verification.decide')?'Review decision':'Review history'}</DropdownMenuItem>}
                        </DropdownMenuContent></DropdownMenu>

                      </td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
              {result?.data && !result.data.items.length && (
                <p className="p-8 text-center text-slate-500">
                  {params.get("status") || params.get("person") ? "No evidence matches these filters." : kind === "selfies" ? "No verification selfies submitted. The customer must upload a selfie from Identity review in their Gilo profile. Profile avatars are separate." : kind === "documents" ? "No identity documents submitted. Ask the customer to upload their document from Identity review in their Gilo profile." : "No passenger-trip vehicle or licence uploads found for this account or queue."}
                </p>
              )}
            </CardContent>
          </Card>
          {result?.data && <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
            <Button
              variant="outline"
              disabled={result.data.page <= 1}
              onClick={() => update({ page: String(result.data!.page - 1) })}
            >
              Previous
            </Button>
            <span className="text-xs text-slate-500">
              Page {result.data.page} · {result.data.total} records
            </span>
            <Button
              variant="outline"
              disabled={result.data.page * 25 >= result.data.total}
              onClick={() => update({ page: String(result.data!.page + 1) })}
            >
              Next
            </Button>
          </div>}
        </>
    </>
  );
}
function EvidenceViewer({
  kind,
  record,
  side,
  onClose,
}: {
  kind: string;
  record: Evidence;
  side: string;
  onClose: () => void;
}) {
  const { session } = useAuth();
  const [reason, setReason] = useState(""),
    [request, setRequest] = useState<{
      reason: string;
      attempt: number;
    } | null>(null),
    [state, setState] = useState<{
      url?: string;
      error?: string;
      attempt: number;
    } | null>(null);
  useEffect(() => {
    if (!request || !session) return;
    const controller = new AbortController();
    let active = true,
      url: string | undefined;
    fetchEvidence(
      kind,
      record.id,
      side,
      request.reason,
      record.evidence.find((e) => e.side === side)?.revision || "",
      session.csrf_token,
      controller.signal,
    )
      .then((blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setState({ url, attempt: request.attempt });
      })
      .catch((e) => {
        if (active) setState({ error: e.message, attempt: request.attempt });
      });
    return () => {
      active = false;
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [request, session, kind, record, side]);
  const current = state?.attempt === request?.attempt ? state : null;
  const busy = Boolean(request && !current);
  return (
    <Card className="mb-6 border-emerald-300">
      <CardContent className="p-6">
        <div className="flex justify-between gap-4">
          <h2 className="text-lg font-semibold">
            {title(side)} · {record.reference || record.id}
          </h2>
          <Button variant="ghost" aria-label="Close evidence" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (busy) return;
            setRequest({
              reason: reason.trim(),
              attempt: (request?.attempt || 0) + 1,
            });
          }}
        >
          <label className="min-w-56 flex-1 space-y-2 text-sm">
            Review reason
            <Input
              className="w-full rounded-lg border px-3 py-2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={5}
              maxLength={500}
              disabled={busy}
              placeholder="Why is this evidence needed?"
            />
          </label>
          <Button type="submit" disabled={busy || reason.trim().length < 5}>
            {busy ? "Opening…" : "Open protected image"}
          </Button>
        </form>
        {current?.error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-800"
          >
            {current.error}
          </p>
        )}
        {current?.url && (
          <img
            className="mx-auto mt-5 max-h-[650px] max-w-full rounded-lg object-contain"
            src={current.url}
            alt={`${title(side)} evidence for record ${record.id}`}
          />
        )}
        <p className="mt-4 text-xs text-slate-500">
          Use only for authorized verification. Closing this panel releases the
          displayed image from the browser view.
        </p>
      </CardContent>
    </Card>
  );
}
