import {CatalogBusyContext} from './useCatalogBusy';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {FilterBuilder} from "@/components/ui/filter-builder";
import { SegmentedControl, SegmentedItem } from "@/components/ui/segmented-control";
import {AdminTable} from '@/components/ui/admin-table';
import {VehicleCreator} from './VehicleCreator';
import {LuggageSurchargeEditor} from "./LuggageSurchargeEditor";
import {VehicleIconEditor} from "./VehicleIconEditor";
import {VehicleAvailability} from "./VehicleAvailability";
import {LuggageCreator} from "./LuggageCreator";
import {LuggageHistory} from "./LuggageHistory";
import { CatalogUsage } from "./CatalogUsage";
import { CatalogEditor } from "./CatalogEditor";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CarFront, Luggage, Plus, RefreshCw, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "./useAuth";
import { useRead } from "./useRead";
type Kind = "vehicles" | "luggage";
type Entry = {
  revision: string;
  id: number;
  key: string;
  label: string;
  is_active: boolean | null;
  sort_order: number | null;
  max_seats?: number | null;
  capacity_limit?: number | null;
  description?: string | null;
  surcharge_percent?: string | null;
  has_icon: boolean;
  updated_at: string | null;
};
type Page = { items: Entry[]; total: number; page: number };
const date = (value: string | null) =>
  value && !Number.isNaN(new Date(value).getTime())
    ? new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Not recorded";
export function Catalog() {
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();
  const kind = params.get("kind") || "vehicles";
  if (!session?.staff.permissions.includes("master-data.read"))
    return (
      <Card>
        <CardContent className="p-6">
          Your role does not include access to this module.
        </CardContent>
      </Card>
    );
  if (kind !== "vehicles" && kind !== "luggage")
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <p role="alert">This catalog is not available.</p>
          <Button onClick={() => setParams({ kind: "vehicles" })}>
            Open vehicle types
          </Button>
        </CardContent>
      </Card>
    );
  return <CatalogContent key={`${kind}:${session.staff.id}:${session.csrf_token}`} kind={kind} />;
}
function CatalogContent({ kind }: { kind: Kind }) {

  const { session } = useAuth();
  const [dialogBusy,setDialogBusy]=useState(false);
  const manage = session?.staff.permissions.includes("master-data.write");
  const [creating,setCreating]=useState(false),[historyId,setHistoryId]=useState<number|null>(null);
  const [surchargeItem,setSurchargeItem]=useState<Entry|null>(null);
  const [iconItem,setIconItem]=useState<Entry|null>(null);
  const [capacityMode,setCapacityMode]=useState(false);
  const [availability,setAvailability]=useState<Entry|null>(null);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [notice, setNotice] = useState("");
  const [usageId, setUsageId] = useState<number | null>(null);
  const [params, setParams] = useSearchParams(),
    [version, setVersion] = useState(0);
  const page = params.get("page") || "1",
    state = params.get("state") || "",
    search = params.get("search") || "";
  const query = new URLSearchParams({
    page,
    ...(state ? { state } : {}),
    ...(search ? { search } : {}),
  });
  const result = useRead<Page>(`/catalog/${kind}?${query}`, version);

  const closeDialog=()=>{setCreating(false);setSelected(null);setUsageId(null);setHistoryId(null);setSurchargeItem(null);setIconItem(null);setAvailability(null);};
  const dialogOpen=creating||selected!==null||usageId!==null||historyId!==null||surchargeItem!==null||iconItem!==null||availability!==null;
  const dialogTitle=creating?(kind==='vehicles'?'Add vehicle type':'Add luggage option'):selected?'Edit catalog option':usageId!==null?'Catalog usage':historyId!==null?'Catalog history':surchargeItem?'Luggage surcharge':iconItem?'Catalog icon':capacityMode?'Vehicle capacity':'Vehicle availability';
  const filters=<FilterBuilder fields={[
   {key:'search',label:'Search label or key',operator:'matches',value:search,maxLength:80,valid:value=>value.length>=2},
   {key:'state',label:'Status',value:state,options:[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]}
  ]} onChange={values=>{setParams(previous=>{const next=new URLSearchParams(previous);next.delete('page');for(const [key,value] of Object.entries(values)){if(value)next.set(key,value);else next.delete(key);}return next;});}}/>;
  function move(next: number) {
    const updated = new URLSearchParams(params);
    updated.set("page", String(next));
    setParams(updated);
  }
  return (
    <section className="space-y-6" aria-labelledby="catalog-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700">Configuration</p>
          <h1 id="catalog-title" className="mt-2 text-2xl font-semibold tracking-tight">
            Master data
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Inspect vehicle types and luggage options used by Gilo rides and
            trips.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">{manage&&<Button onClick={()=>{closeDialog();setCreating(true);}}><Plus size={16}/>{kind==='vehicles'?'Add vehicle type':'Add luggage option'}</Button>}<Button
          variant="outline"
          onClick={() => {
            setIconItem(null);
            setAvailability(null);
            setHistoryId(null);
            setSelected(null);
            setUsageId(null);
            setVersion((v) => v + 1);
          }}
        >
          <RefreshCw size={16}/>Refresh catalog
        </Button></div>
      </div>
      <SegmentedControl aria-label="Catalog selection" className="mb-5">
        <SegmentedItem
          
          aria-pressed={kind === "vehicles"}
          onClick={() => setParams({ kind: "vehicles" })}
        >
          <CarFront className="size-4" />
          Vehicle types
        </SegmentedItem>
        <SegmentedItem
          
          aria-pressed={kind === "luggage"}
          onClick={() => setParams({ kind: "luggage" })}
        >
          <Luggage className="size-4" />
          Luggage options
        </SegmentedItem>
      </SegmentedControl>
      <details className="rounded-xl border px-5 py-3 text-sm"><summary className="cursor-pointer font-medium">Catalog management guidance</summary><p className="mt-3 leading-relaxed text-muted-foreground">Owners can preview and edit labels, luggage descriptions and display
          order, plus luggage availability. New luggage options start inactive after a reviewed creation preview. Vehicle availability has a separate preview with open-journey and pricing checks. Capacity has a separate inactive-only review within supported limits. Pricing is managed separately. Use the icon editor to inspect and replace catalog images.</p></details>
      {notice && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-4 text-emerald-800"
        >
          {notice}
        </p>
      )}
      {!result && <p role="status">Loading catalog…</p>}
      {result?.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">
          {result.error}
        </p>
      )}
      <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {kind === "vehicles" ? "Vehicle types" : "Luggage options"}
            </h2>
            <span className="text-sm text-slate-500">
              {result?.data ? `${result.data.total} matching records` : "Loading records"} · Recorded times in IST
            </span>
          </div>
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <AdminTable toolbar={filters} className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50">
                  <tr>
                    {[
                      "Option",
                      "Status",
                      kind === "vehicles"
                        ? "Passenger seats"
                        : "Stored surcharge",
                      "Display order",
                      "Icon",
                      "Recorded update (IST)",
                      "Actions",
                    ].map((label) => (
                      <th
                        key={label}
                        className="p-4 font-medium text-slate-600"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result?.data?.items.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="min-w-52 p-4">
                        <p className="font-semibold">{row.label}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {row.key} · ID {row.id}
                        </p>
                        {kind === "luggage" && row.description && (
                          <p className="mt-2 max-w-sm text-slate-600">
                            {row.description}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.is_active === true ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                        >
                          {row.is_active === true
                            ? "Active"
                            : row.is_active === false
                              ? "Inactive"
                              : "Not recorded"}
                        </span>
                      </td>
                      <td className="p-4">
                        {kind === "vehicles" ? (
                          <>
                            {row.max_seats ?? "Not recorded"}
                            {row.max_seats === 0 && (
                              <p className="mt-1 text-xs text-amber-800">
                                No passenger capacity
                              </p>
                            )}
                          </>
                        ) : row.surcharge_percent != null ? (
                          `${row.surcharge_percent}%`
                        ) : (
                          "Not recorded"
                        )}
                      </td>
                      <td className="p-4">
                        {row.sort_order ?? "Not recorded"}
                      </td>
                      <td className="p-4">
                        {row.has_icon ? "Configured" : "Not configured"}
                      </td>
                      <td className="min-w-44 p-4 text-slate-600">
                        {date(row.updated_at)}
                      </td>
                      <td className="p-4"><DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions for ${row.label}`}/>}><MoreHorizontal size={18}/></DropdownMenuTrigger><DropdownMenuContent>
                        <DropdownMenuItem
                          
                          onClick={() => {
                            setSelected(null);
                            setUsageId(row.id);
                          }}
                        >
                          View usage of {row.label}
                        </DropdownMenuItem>
                        {<DropdownMenuItem  onClick={()=>{setHistoryId(row.id);setSelected(null);setCreating(false);setAvailability(null);}}>History of {row.label}</DropdownMenuItem>}
                        {kind==='vehicles'&&manage&&<DropdownMenuItem  onClick={()=>{setIconItem(null);setCapacityMode(false);setAvailability(row);setSelected(null);setUsageId(null);setHistoryId(null);}}>Availability of {row.label}</DropdownMenuItem>}
                        {kind==='luggage'&&manage&&<DropdownMenuItem  onClick={()=>{setSurchargeItem(row);setIconItem(null);setSelected(null);setHistoryId(null);setCreating(false);}}>Surcharge of {row.label}</DropdownMenuItem>}
                        {manage&&<DropdownMenuItem  onClick={()=>{setIconItem(row);setAvailability(null);setSelected(null);setHistoryId(null);setUsageId(null);}}>Icon of {row.label}</DropdownMenuItem>}
                        {kind==='vehicles'&&manage&&row.capacity_limit!=null&&<DropdownMenuItem  disabled={row.is_active!==false} onClick={()=>{setIconItem(null);setCapacityMode(true);setAvailability(row);setSelected(null);setUsageId(null);setHistoryId(null);}}>Capacity of {row.label}</DropdownMenuItem>}
                        {manage && (
                          <DropdownMenuItem
                            
                            disabled={Boolean(selected)||creating}
                            onClick={() => {
                              setIconItem(null);
                              setAvailability(null);
                              setSelected(row);
                              setUsageId(null);
                              setNotice("");
                            }}
                          >
                            Edit {row.label}
                          </DropdownMenuItem>
                        )}
</DropdownMenuContent></DropdownMenu>                      </td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
              {result?.data?.items.length === 0 && (
                <p className="p-6 text-slate-500">
                  No options match these filters.
                </p>
              )}
            </CardContent>
          </Card>
          <p className="text-xs leading-5 text-slate-500">
            {kind === "vehicles"
              ? "Passenger capacity excludes the traveler. Zero-seat vehicle types cannot carry passengers."
              : "Surcharge revisions require an inactive option and independent approval. Existing ride fares are preserved."}
          </p>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              disabled={!result?.data || result.data.page <= 1}
              onClick={() => move(result!.data!.page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-slate-600">
              Page {result?.data?.page ?? page}
            </span>
            <Button
              variant="outline"
              disabled={!result?.data || result.data.page * 25 >= result.data.total}
              onClick={() => move(result!.data!.page + 1)}
            >
              Next
            </Button>
          </div>
      </>
      <Dialog open={dialogOpen} onOpenChange={open=>{if(!open&&!dialogBusy)closeDialog();}}><DialogContent className="max-w-3xl"><DialogTitle className="pr-8 text-xl font-semibold">{dialogTitle}</DialogTitle><DialogDescription className="mt-1 text-sm text-muted-foreground">Review catalog details and any proposed changes before confirming.</DialogDescription><CatalogBusyContext.Provider value={setDialogBusy}><div className="mt-5">      {kind==='vehicles'&&creating&&<VehicleCreator onClose={()=>setCreating(false)} onCreated={id=>{setCreating(false);setHistoryId(id);setNotice('Vehicle type created inactive. Configure its icon and approved pricing before activation.');setParams({kind:'vehicles',state:'inactive'});setVersion(v=>v+1);}}/>}
      {kind==='luggage'&&creating&&<LuggageCreator onClose={()=>setCreating(false)} onCreated={id=>{setCreating(false);setHistoryId(id);setNotice('Luggage option created inactive. Review it before activation.');setParams({kind:'luggage',state:'inactive'});setVersion(v=>v+1);}}/>}
      {historyId!==null&&<LuggageHistory kind={kind} key={historyId} id={historyId} onClose={()=>setHistoryId(null)}/>}
      {surchargeItem&&manage&&<LuggageSurchargeEditor key={surchargeItem.id} id={surchargeItem.id} label={surchargeItem.label} onClose={()=>setSurchargeItem(null)} onChanged={()=>setVersion(v=>v+1)}/>}
      {iconItem&&manage&&<VehicleIconEditor kind={kind} key={iconItem.id} item={iconItem} onClose={()=>setIconItem(null)} onSaved={()=>{setIconItem(null);setNotice("Catalog icon updated and recorded in history.");setVersion(v=>v+1);}}/>}
      {availability&&manage&&<VehicleAvailability key={`${availability.id}:${capacityMode}`} capacity={capacityMode} item={availability} onClose={()=>setAvailability(null)} onSaved={()=>{setAvailability(null);setNotice(`Vehicle ${capacityMode?"capacity":"availability"} updated and recorded in history.`);setVersion(v=>v+1);}}/>}
      {selected && manage && (
        <CatalogEditor
          key={selected.id}
          kind={kind}
          item={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            setNotice(
              "Catalog updated. The change has been recorded in audit history.",
            );
            setVersion((v) => v + 1);
          }}
        />
      )}
      {usageId !== null && (
        <CatalogUsage
          key={kind + usageId}
          kind={kind}
          id={usageId}
          onClose={() => setUsageId(null)}
        />
      )}
</div></CatalogBusyContext.Provider></DialogContent></Dialog>
    </section>
  );
}
