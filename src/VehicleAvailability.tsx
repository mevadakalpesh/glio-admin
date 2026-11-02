import {useCatalogBusy} from './useCatalogBusy';
import {Textarea} from '@/components/ui/textarea';
import {NativeSelect} from '@/components/ui/native-select';
import {Input} from '@/components/ui/input';
import {useEffect,useRef,useState} from 'react';
import {api} from './api';
import {useAuth} from './useAuth';
import {Button} from '@/components/ui/button';
type Preview={preview_id:string;before:boolean|number;after:boolean|number;label:string;reason:string;expires_at:string};
export function VehicleAvailability({item,onClose,onSaved,capacity=false}:{capacity?:boolean;item:{id:number;label:string;is_active:boolean|null;revision:string;max_seats?:number|null;capacity_limit?:number|null};onClose:()=>void;onSaved:()=>void}){
  const {session}=useAuth();
  const setting=capacity?"capacity":"availability";
  const [seats,setSeats]=useState(String(item.max_seats??""));
  const [active,setActive]=useState(item.is_active===true),[reason,setReason]=useState(''),[preview,setPreview]=useState<Preview|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[attempted,setAttempted]=useState(false);
  const pending=useRef<AbortController|null>(null),operation=useRef<string|null>(null);
  useCatalogBusy(busy);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
  if(!session?.staff.permissions.includes('master-data.write'))return null;
  async function run(confirm=false){
    if(!session||pending.current||confirm&&!preview)return;
    const controller=new AbortController();pending.current=controller;setBusy(true);setError('');
    try{
      if(confirm){
        operation.current ||=crypto.randomUUID();setAttempted(true);
        await api(`/catalog/vehicles/${item.id}/${setting}`,{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{preview_id:preview!.preview_id,operation_id:operation.current}});
        if(pending.current===controller)onSaved();
      }else{
        const result=await api<Preview>(`/catalog/vehicles/${item.id}/${setting}-preview`,{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{revision:item.revision,...(capacity?{max_seats:Number(seats)}:{is_active:active}),reason}});
        if(pending.current===controller){setPreview(result);setAttempted(false);operation.current=null;}
      }
    }catch(e){if(pending.current===controller)setError(e instanceof Error?e.message:'Unable to update availability.');}
    finally{if(pending.current===controller){pending.current=null;setBusy(false);}}
  }
  return <section aria-label={`Vehicle ${setting}`} className="space-y-4 rounded-xl border bg-white p-5">
    <div className="flex justify-between gap-3"><h2 className="text-lg font-semibold">Vehicle {setting} · {item.label}</h2><Button variant="outline" disabled={busy} onClick={onClose}>Close {setting}</Button></div>
    <p className="text-sm text-slate-600">{capacity?`Capacity excludes the traveler. Deactivate the type and resolve open trips, requests and bookings first. Choose 1–${item.capacity_limit??"?"} passenger seats within the supported profile. Review and reactivate separately after saving.`:"Deactivate only after all open trips and ride requests using this type are resolved, including drafts and reviews. Activation checks current and scheduled passenger pricing. This action does not cancel journeys, issue refunds or change capacity."}</p>
    {preview?<><p className="rounded-lg bg-amber-50 p-3">{capacity?`${preview.before} seats`:preview.before?'Active':'Inactive'} → {capacity?`${preview.after} seats`:preview.after?'Active':'Inactive'}</p><p>Reason: {preview.reason}</p><p className="text-sm">Valid until {new Date(preview.expires_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST. Eligibility is checked again on confirmation.</p><div className="flex gap-3"><Button disabled={busy} onClick={()=>void run(true)}>{attempted?'Retry same change':`Confirm ${setting}`}</Button><Button variant="outline" disabled={busy||attempted} onClick={()=>setPreview(null)}>Back to edit</Button></div>{attempted&&<p className="text-sm">Retry to recover an interrupted response. Close and refresh the catalog if a new review is required.</p>}</>:<form className="space-y-4" onSubmit={e=>{e.preventDefault();void run();}}>
      {capacity?<label className="block">Passenger seats<Input className="mt-2 block rounded border p-2" type="number" min={1} max={item.capacity_limit??40} step={1} required disabled={busy} value={seats} onChange={e=>setSeats(e.target.value)}/></label>:<label className="block">Availability<NativeSelect className="mt-2 block rounded border p-2" disabled={busy} value={active?'active':'inactive'} onChange={e=>setActive(e.target.value==='active')}><option value="active">Active</option><option value="inactive">Inactive</option></NativeSelect></label>}
      <label className="block">Reason for {setting} change<Textarea className="mt-2 block w-full rounded border p-2" required minLength={10} maxLength={500} disabled={busy} value={reason} onChange={e=>setReason(e.target.value)}/></label>
      <Button disabled={busy||(capacity?Number(seats)===item.max_seats:active===item.is_active)} type="submit">Review {setting}</Button>
    </form>}
    {error&&<p role="alert" className="rounded bg-red-50 p-3 text-red-800">{error}</p>}
  </section>;
}
