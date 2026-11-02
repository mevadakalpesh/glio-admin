import {Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger} from '@/components/ui/dialog';
import {UserPlus, RefreshCw, MoreHorizontal, Download, Info, FileSearch} from 'lucide-react';
import {DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {FilterBuilder} from '@/components/ui/filter-builder';
import {AdminTable} from '@/components/ui/admin-table';
import {Textarea} from '@/components/ui/textarea';
import {NativeSelect} from '@/components/ui/native-select';
import {DateRangeFilter} from '@/components/ui/date-range-filter';
import {Input} from '@/components/ui/input';
import {AuditExport} from './AuditExport';
import { useSearchParams } from "react-router-dom";
import { RegionSelection } from "./RegionSelection";
import { InvitationActions } from "./InvitationActions";
import { invitationLabel } from "./invitationLabel";
import { useEffect, useState, useRef } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "./api";
import { useAuth } from "./useAuth";
import type { Staff } from "./authTypes";
const field = "w-full rounded-lg border bg-white px-3 py-2 text-sm";
type Page<T> = { items: T[]; total: number; page: number };
type Audit = {
  id: string;
  action: string;
  actor_id: string | null;
  subject_id: string | null;
  created_at: string;
  metadata: unknown;
};
export function Access({ audit = false }: { audit?: boolean }) {
  const { session, reload } = useAuth(),
    [page, setPage] = useState(1),
    [data, setData] = useState<Page<Staff | Audit> | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [version, setVersion] = useState(0),
    [link, setLink] = useState(""),
    [selected, setSelected] = useState<Staff | null>(null),
    [notice, setNotice] = useState("");
  const [staffFormOpen, setStaffFormOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  const auditAction = audit ? params.get("action") || "" : "";
  const auditActor = audit ? params.get("actor") || "" : "";
  const auditReference = audit ? params.get("reference") || "" : "";
  const auditEvent = audit ? params.get("event") || "" : "";
  const auditFrom = audit ? params.get("from") || "" : "";
  const auditTo = audit ? params.get("to") || "" : "";
  const updateAuditFilters = (values: Record<string, string>) => {
    setPage(1);
    setParams(previous => {
      const next = new URLSearchParams(previous);
      for (const [key, value] of Object.entries(values)) {
        if (value) next.set(key, value); else next.delete(key);
      }
      return next;
    });
  };
  const validAuditId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  const pending = useRef(false);
  const allowed = session?.staff.permissions.includes(
      audit ? "audit.read" : "staff.read",
    ),
    manage = session?.staff.permissions.includes("staff.manage");
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    let current = true;
    Promise.resolve().then(() => {
      if (current) {
        setData(null);
        setError("");
      }
    });
    const query = new URLSearchParams({ page: String(page) });
    if (auditAction) query.set("action", auditAction);
    if (auditActor) query.set("actor", auditActor);
    if (auditReference) query.set("reference", auditReference);
    if (auditEvent) query.set("event", auditEvent);
    if (auditFrom) query.set("from", auditFrom);
    if (auditTo) query.set("to", auditTo);
    api<Page<Staff | Audit>>(`${audit ? "/audit" : "/staff"}?${query}`, {
      signal: controller.signal,
    })
      .then((value) => {
        if (current) setData(value);
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [audit, page, version, allowed, auditAction, auditActor, auditReference, auditEvent, auditFrom, auditTo]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current || busy || !session) return;
    const form = event.currentTarget,
      values = new FormData(form);
    pending.current = true;
    setBusy(true);
    setError("");
    setLink("");
    setNotice("");
    try {
      const result = await api<{
        invitation_url?: string;
        reauthenticate?: boolean;
      }>(selected ? `/staff/${selected.id}` : "/staff/invite", {
        method: selected ? "PATCH" : "POST",
        csrf: session.csrf_token,
        body: selected
          ? {
              role: values.get("role"),
              assigned_states: values.getAll("assigned_states"),
              active: values.get("active") === "true",
              reason: values.get("reason"),
            }
          : {
              name: values.get("name"),
              email: values.get("email"),
              role: values.get("role"),
              assigned_states: values.getAll("assigned_states"),
            },
      });
      setLink(result.invitation_url || "");
      setNotice(
        selected
          ? "Access updated. Existing sessions have been revoked."
          : "Invitation created. Share it privately with this staff member.",
      );
      if (selected) setStaffFormOpen(false);
      setSelected(null);
      form.reset();
      setVersion((v) => v + 1);
      if (result.reauthenticate) await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save changes.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  if (!allowed)
    return (
      <Card>
        <CardContent className="p-6">
          Your role does not include access to this module.
        </CardContent>
      </Card>
    );
  return (
    <>
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">
            {audit ? "Audit history" : "Team & access"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {audit
              ? "Staff actions, case operations and access history · Times in IST"
              : "Manage staff roles, regional access and invitations."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
        {!audit && manage && <Button onClick={() => {setSelected(null);setLink("");setError("");setStaffFormOpen(true);}}><UserPlus size={16}/>Invite staff</Button>}
        {audit && session?.staff.permissions.includes("audit.export") && <Dialog>
          <DialogTrigger render={<Button variant="outline"/>}><Download size={16}/>Export audit summary</DialogTrigger>
          <DialogContent>
            <DialogTitle className="pr-8 text-xl font-semibold">Export audit summary</DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">Download a report using the current audit filters.</DialogDescription>
            <div className="mt-5"><AuditExport embedded key={[auditAction,auditActor,auditReference,auditEvent,auditFrom,auditTo].join(':')} filters={Object.fromEntries(Object.entries({action:auditAction,actor:auditActor,reference:auditReference,event:auditEvent,from:auditFrom,to:auditTo}).filter(([,value])=>Boolean(value)))}/></div>
          </DialogContent>
        </Dialog>}
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            setSelected(null);
            setLink("");
            setVersion((v) => v + 1);
          }}
        >
          <RefreshCw size={15}/>Refresh
        </Button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mb-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {notice}
        </p>
      )}
      {!audit && manage && (
        <Dialog open={staffFormOpen} onOpenChange={open => {if(busy)return;setStaffFormOpen(open);if(!open){setSelected(null);setLink("");setError("");}}}>
          <DialogContent className="max-w-2xl">
            <DialogTitle className="mb-2 pr-8 text-xl font-semibold">
              {selected
                ? `Update access · ${selected.name}`
                : "Invite a staff member"}
            </DialogTitle>
            <DialogDescription className="mb-5 text-sm text-muted-foreground">Set the staff member’s role and regional access.</DialogDescription>
            {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
            {!link && <form
              key={selected?.id || "invite"}
              onSubmit={submit}
              className="grid gap-4 md:grid-cols-2"
            >
              {!selected && (
                <>
                  <label className="space-y-2 text-sm">
                    Full name
                    <Input
                      name="name"
                      className={field}
                      required
                      minLength={2}
                      maxLength={120}
                      disabled={busy}
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    Staff email
                    <Input
                      name="email"
                      type="email"
                      className={field}
                      required
                      maxLength={254}
                      disabled={busy}
                    />
                  </label>
                </>
              )}
              <label className="space-y-2 text-sm">
                Role
                <NativeSelect
                  name="role"
                  className={field}
                  defaultValue={selected?.role || "operations"}
                  disabled={busy}
                >
                  {[
                    "owner",
                    "operations",
                    "support",
                    "verification",
                    "finance",
                    "safety",
                    "analyst",
                    "auditor",
                  ].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </NativeSelect>
              </label>
              <RegionSelection key={selected?.id || "new"} selected={selected?.assigned_states || []} disabled={busy} />
              {selected && (
                <>
                  <label className="space-y-2 text-sm">
                    Account state
                    <NativeSelect
                      name="active"
                      className={field}
                      defaultValue={String(selected.active)}
                      disabled={busy}
                    >
                      <option value="true">Active</option>
                      <option value="false">Disabled</option>
                    </NativeSelect>
                  </label>
                  <label className="space-y-2 text-sm md:col-span-2">
                    Reason
                    <Textarea
                      name="reason"
                      required
                      minLength={5}
                      maxLength={500}
                      className={field}
                      disabled={busy}
                    />
                  </label>
                </>
              )}
              <p className="text-xs leading-5 text-slate-500 md:col-span-2">
                Owners can manage staff, inspect journeys and read audit
                history. Operations staff can inspect journeys within assigned states. Auditors can read audit history. Other roles gain
                permissions as their operational modules are implemented. Access
                changes require a sign-in within the last 15 minutes.
              </p>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>
                  {busy
                    ? "Saving…"
                    : selected
                      ? "Save access changes"
                      : "Create invitation"}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {setStaffFormOpen(false);setSelected(null);setLink("");}}
                  >
                    Cancel
                  </Button>
              </div>
            </form>}
            {selected && session && (
              <InvitationActions
                key={selected.id + selected.invitation_revision}
                staff={selected}
                allowRecovery={session.staff.role === "owner" && selected.id !== session.staff.id}
                csrf={session.csrf_token}
                busy={busy}
                onBusy={setBusy}
                onComplete={(newLink, recovery) => {
                  setLink(newLink);
                  setNotice(
                    recovery ? "Account recovery authorized. Old credentials and sessions are revoked. Share this setup link privately within 30 minutes." : newLink
                      ? "Invitation renewed for 24 hours. The previous link no longer works. Share the new link privately."
                      : "Invitation revoked. The unused link no longer works.",
                  );
                  setSelected(null);
                  setVersion((v) => v + 1);
                }}
              />
            )}
            {link && (
              <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="mb-2 text-sm">
                  Private setup link · expiry is stated in the confirmation above · shown once
                </p>
                <Input
                  readOnly
                  aria-label="Private invitation link"
                  value={link}
                  className={field}
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  className="mt-3"
                  variant="outline"
                  onClick={() => setLink("")}
                >
                  Hide link
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
      <Card className="gap-0 py-0">
        <CardContent className="overflow-x-auto p-0">
          <AdminTable className="w-full text-left text-sm" toolbar={audit ? <div>
          <FilterBuilder fields={[
            {key: 'action', label: 'Exact action', value: auditAction, maxLength: 120},
            {key: 'actor', label: 'Staff actor ID', value: auditActor, maxLength: 36, valid: validAuditId},
            {key: 'reference', label: 'Related record ID', value: auditReference, maxLength: 36, valid: validAuditId},
            {key: 'event', label: 'Event ID', value: auditEvent, maxLength: 36, valid: validAuditId},
          ]} onChange={updateAuditFilters} hasExtraFilters={Boolean(auditFrom || auditTo)}
            onClear={() => updateAuditFilters({action: '', actor: '', reference: '', event: '', from: '', to: ''})}>
            <DateRangeFilter key={`${auditFrom}:${auditTo}`} from={auditFrom} to={auditTo} label="Audit date range (IST)" onChange={updateAuditFilters}/>
          </FilterBuilder>
          <p className="mt-3 text-xs text-muted-foreground">Filters apply automatically. Use complete UUIDs for ID filters. Dates include the full day in IST.</p>
        </div> : undefined}>
            <thead className="border-b bg-slate-50 text-xs text-slate-500">
              <tr>
                {(audit
                  ? ["Event", "Actor / Subject", "When (IST)", "Actions"]
                  : ["Staff member", "Role", "Account", "Setup status", "Actions"]
                ).map((h, i) => (
                  <th key={i} className="p-4 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.items.map((row) =>
                audit
                  ? (() => {
                      const event = row as Audit;
                      return (
                        <tr key={event.id} className="border-b last:border-0">
                          <td className="p-4 font-medium">
                            {event.action
                              .replaceAll(".", " · ")
                              .replaceAll("_", " ")}
                            <p className="mt-1 font-mono text-xs font-normal text-slate-500">{event.action}</p>
                            <p className="mt-1 break-all text-xs font-normal text-slate-500">Event: {event.id}</p>
                          </td>
                          <td className="p-4 text-xs text-slate-500">
                            <p>{event.actor_id || "System"}</p>
                            <p className="mt-1">{event.subject_id || "—"}</p>
                          </td>
                          <td className="whitespace-nowrap p-4">
                            {Number.isFinite(Date.parse(event.created_at)) ? new Intl.DateTimeFormat("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                              timeZone: "Asia/Kolkata",
                            }).format(new Date(event.created_at)) : "Time unavailable"}
                          </td>
                          <td className="max-w-xs break-words p-4">
                            <AuditEventActions event={event}/>
                          </td>
                        </tr>
                      );
                    })()
                  : (() => {
                      const staff = row as Staff;
                      return (
                        <tr key={staff.id} className="border-b last:border-0">
                          <td className="p-4">
                            <p className="font-medium">{staff.name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {staff.email}
                            </p>
                          </td>
                          <td className="p-4 capitalize">{staff.role}</td>
                          <td className="p-4">
                            {staff.active ? "Active" : "Disabled"}
                          </td>
                          <td className="p-4">
                            {invitationLabel(staff.invitation_state)}
                          </td>
                          <td className="p-4">
                            {manage && (
                              <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" disabled={busy} aria-label={`Actions for ${staff.name}`}/>}><MoreHorizontal size={18}/></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => {setSelected(staff);setLink("");setError("");setStaffFormOpen(true);}}>Edit access</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                            )}
                          </td>
                        </tr>
                      );
                    })(),
              )}
            </tbody>
          </AdminTable>
          {!data && !error && (
            <p className="p-6" role="status">
              Loading…
            </p>
          )}
          {data?.items.length === 0 && (
            <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center"><FileSearch size={28} className="mb-3 text-muted-foreground"/><p className="font-semibold">No records found.</p><p className="mt-2 text-sm text-muted-foreground">Try adjusting your filters.</p></div>
          )}
        </CardContent>
      </Card>
      <div className="mt-4 flex items-center justify-between">
        <Button
          variant="outline"
          disabled={busy || page === 1 || !data}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </Button>
        <span className="text-xs text-slate-500">
          Page {page}
          {data ? ` · ${data.total} records` : ""}
        </span>
        <Button
          variant="outline"
          disabled={busy || !data || page * 25 >= data.total}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </>
  );
}

function AuditEventActions({event}:{event:Audit}){
 const [open,setOpen]=useState(false);
 return <><DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions for event ${event.id}`}/>}><MoreHorizontal size={18}/></DropdownMenuTrigger><DropdownMenuContent><p className="px-3 py-2 text-xs text-muted-foreground">Actions</p><DropdownMenuItem onClick={()=>setOpen(true)}><Info size={14}/>View event</DropdownMenuItem></DropdownMenuContent></DropdownMenu><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle className="pr-8 text-xl font-semibold">Event details</DialogTitle><DialogDescription className="mt-2 break-all text-sm text-muted-foreground">{event.action} · {event.id}</DialogDescription><pre className="mt-5 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-4 text-xs">{JSON.stringify(event.metadata,null,2)}</pre></DialogContent></Dialog></>;
}
