import {Input} from '@/components/ui/input';
import {NativeSelect} from '@/components/ui/native-select';
import {useRef,useState} from "react";
import {useAuth} from "./useAuth";
import {useRead} from "./useRead";
import {api} from "./api";
import {Button} from "@/components/ui/button";
type Staff={id:string;name:string;role:string;is_you:boolean};
type Props={id:string;version:number;onFinished:(error?:string)=>void};
export function CaseReassignment(props:Props){
 const {session}=useAuth();const [open,setOpen]=useState(false);
 if(!session?.staff.permissions.includes("cases.reassign"))return null;
 return <div className="border-t pt-4">{open?<Transfer {...props} onCancel={()=>setOpen(false)}/>:<Button variant="outline" onClick={()=>setOpen(true)}>Assign to a staff member</Button>}</div>;
}
function Transfer({id,version,onFinished,onCancel}:Props&{onCancel:()=>void}){
 const {session}=useAuth();const [page,setPage]=useState(1),[revision,setRevision]=useState(0),[selected,setSelected]=useState<Staff|null>(null),[reason,setReason]=useState(""),[review,setReview]=useState(false),[busy,setBusy]=useState(false);
 const saving=useRef(false);
 const result=useRead<{items:Staff[];page:number;page_size:number;total:number}>(`/ride-cases/${encodeURIComponent(id)}/assignees?page=${page}`,revision);
 async function confirm(){
  if(!selected||!session||saving.current)return;saving.current=true;setBusy(true);
  try{await api(`/ride-cases/${encodeURIComponent(id)}/assignment`,{method:"POST",csrf:session.csrf_token,body:{action:"reassign",staff_id:selected.id,version,reason:reason.trim()}});onFinished();}
  catch(e){onFinished(e instanceof Error?e.message:"Assignment could not be confirmed. Refresh before trying again.");}
  finally{saving.current=false;setBusy(false);}
 }
 return <div className="space-y-3">
  <h3 className="font-semibold">Assign to a staff member</h3>
  {review&&selected?<>
   <p>Assign this case to <strong>{selected.name}{selected.is_you?" (you)":""}</strong>?</p>
   <p className="text-sm text-slate-600">This replaces the current assignment. It does not resolve the case or change any payment.</p>
   <p className="break-words text-sm">Reason: {reason.trim()}</p>
   <Button disabled={busy} onClick={()=>void confirm()}>{busy?"Saving…":"Confirm reassignment"}</Button>
   <Button variant="outline" disabled={busy} onClick={()=>setReview(false)}>Back</Button>
  </>:<>
   <p className="text-sm text-slate-600">Only active staff with MFA and case assignment access are listed.</p>
   {!result&&<p role="status">Loading eligible staff…</p>}
   {result?.error&&<p role="alert" className="text-red-800">{result.error}</p>}
   <Button variant="outline" onClick={()=>{setSelected(null);setRevision(v=>v+1);}}>Refresh staff</Button>
   {result?.data&&<>
    {result.data.items.length?<label className="block text-sm">Staff member<NativeSelect className="mt-2 block w-full rounded border p-2" value={selected?.id||""} onChange={e=>setSelected(result.data!.items.find(item=>item.id===e.target.value)||null)}><option value="">Choose staff</option>{result.data.items.map(item=><option key={item.id} value={item.id}>{item.name} · {item.role}{item.is_you?" · You":""}</option>)}</NativeSelect></label>:<p>No eligible staff on this page.</p>}
    <div className="flex gap-3"><Button variant="outline" disabled={page<=1} onClick={()=>{setSelected(null);setPage(v=>v-1);}}>Previous staff</Button><span>Page {page}</span><Button variant="outline" disabled={page*result.data.page_size>=result.data.total} onClick={()=>{setSelected(null);setPage(v=>v+1);}}>Next staff</Button></div>
   </>}
   <label className="block text-sm">Reassignment reason<Input className="mt-2 block w-full rounded border p-2" value={reason} maxLength={500} onChange={e=>setReason(e.target.value)}/></label>
   <Button disabled={!selected||!result?.data||reason.trim().length<5||[...reason].some(char=>char.charCodeAt(0)<32||char.charCodeAt(0)===127)} onClick={()=>setReview(true)}>Review reassignment</Button>
  </>}
  <Button variant="outline" disabled={busy} onClick={onCancel}>Cancel reassignment</Button>
 </div>;
}
