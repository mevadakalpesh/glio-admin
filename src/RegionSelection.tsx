import { useEffect, useState } from "react";
import { api } from "./api";
type Region = { code: string; name: string };
export function RegionSelection({ selected, disabled }: { selected: string[]; disabled: boolean }) {
  const [regions, setRegions] = useState<Region[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    api<Region[]>("/regions", { signal: controller.signal }).then(rows => {
      if (!Array.isArray(rows) || !rows.length || rows.some(r => typeof r.code !== "string" || typeof r.name !== "string")) throw Error("State options unavailable.");
      if (!controller.signal.aborted) setRegions(rows);
    }).catch(() => { if (!controller.signal.aborted) setError("State options unavailable. Existing assignments will be preserved."); });
    return () => controller.abort();
  }, []);
  return <fieldset className="space-y-2 md:col-span-2" disabled={disabled}>
    <legend className="text-sm font-medium">Assigned states and union territories</legend>
    <p className="text-xs text-slate-500">Regional access requires both journey endpoints within these states. No selection means no regional journey access. Owners retain all-India access.</p>
    {regions ? <div className="grid max-h-48 gap-2 overflow-auto rounded-lg border p-3 sm:grid-cols-2">{regions.map(region => <label key={region.code} className="flex gap-2 text-sm"><input type="checkbox" name="assigned_states" value={region.code} defaultChecked={selected.includes(region.code)} />{region.name}</label>)}</div> : <><p role={error ? "alert" : "status"} className="text-sm text-slate-600">{error || "Loading state options…"}</p>{selected.map(code => <input key={code} type="hidden" name="assigned_states" value={code} />)}</>}
  </fieldset>;
}
