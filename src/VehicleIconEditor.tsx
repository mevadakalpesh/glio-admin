import {useCatalogBusy} from './useCatalogBusy';
import {Textarea} from '@/components/ui/textarea';
import {useEffect,useRef,useState} from 'react';
import {api} from './api';
import {useAuth} from './useAuth';
import {useRead} from './useRead';
import {Button} from '@/components/ui/button';
type Preview={preview_id:string;data_url:string;expires_at:string;reason:string};
export function VehicleIconEditor({item,onClose,onSaved,kind="vehicles"}:{kind?:"vehicles"|"luggage";item:{id:number;label:string;revision:string};onClose:()=>void;onSaved:()=>void}){
 const {session}=useAuth();
 if(!session?.staff.permissions.includes('master-data.write'))return null;
 return <Editor kind={kind} key={`${item.id}:${session.csrf_token}`} item={item} csrf={session.csrf_token} onClose={onClose} onSaved={onSaved}/>;
}
function Editor({item,csrf,onClose,onSaved,kind}:{kind:"vehicles"|"luggage";item:{id:number;label:string;revision:string};csrf:string;onClose:()=>void;onSaved:()=>void}){
 const title=kind==="luggage"?"Luggage":"Vehicle";
 const current=useRead<{data_url:string|null;fallback_icon?:string|null}>(`/catalog/${kind}/${item.id}/icon`,0);
 const [encoded,setEncoded]=useState(''),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState<Preview|null>(null),[attempted,setAttempted]=useState(false),[filename,setFilename]=useState('');
 const pending=useRef<AbortController|null>(null),reader=useRef<FileReader|null>(null),operation=useRef<string|null>(null);
 useCatalogBusy(busy);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;reader.current?.abort();reader.current=null;},[]);
 function select(file:File|undefined){
   reader.current?.abort();reader.current=null;setEncoded('');setFilename('');setError('');setPreview(null);setAttempted(false);operation.current=null;
   if(!file)return;
   if(file.size>384*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){setError('Choose a PNG, JPEG or WebP image up to 384 KB.');return;}
   const r=new FileReader();reader.current=r;
   r.onload=()=>{if(reader.current!==r)return;setEncoded(String(r.result).split(',')[1]||'');setFilename(file.name);reader.current=null;};
   r.onerror=()=>{if(reader.current===r){setError('Could not read this image. Choose it again.');reader.current=null;}};
   r.readAsDataURL(file);
 }
 async function run(confirm=false){
   if(pending.current||!encoded||confirm&&!preview)return;
   const c=new AbortController();pending.current=c;setBusy(true);setError('');
   try{
     if(confirm){operation.current ||=crypto.randomUUID();setAttempted(true);await api(`/catalog/${kind}/${item.id}/icon`,{method:'POST',csrf,signal:c.signal,body:{preview_id:preview!.preview_id,operation_id:operation.current,image_base64:encoded}});if(pending.current===c)onSaved();}
     else{const p=await api<Preview>(`/catalog/${kind}/${item.id}/icon-preview`,{method:'POST',csrf,signal:c.signal,body:{revision:item.revision,image_base64:encoded,reason}});if(pending.current===c)setPreview(p);}
   }catch(e){if(pending.current===c)setError(e instanceof Error?e.message:'Could not update catalog icon.');}
   finally{if(pending.current===c){pending.current=null;setBusy(false);}}
 }
 return <section aria-label={`${title} icon`} className="space-y-4 rounded-xl border bg-white p-5">
   <div className="flex justify-between gap-3"><h2 className="text-lg font-semibold">{title} icon · {item.label}</h2><Button variant="outline" disabled={busy} onClick={onClose}>Close icon editor</Button></div>
   <p className="text-sm text-slate-600">Use a public catalog illustration, not a customer photo or document. Upload PNG, JPEG or WebP up to 384 KB, at least 16 × 16 pixels and no more than 4 megapixels. Gilo converts it to a PNG within 256 × 256 pixels and removes metadata. Animated images are not supported.</p>
   <div className="flex flex-wrap gap-8"><div><h3 className="mb-2 font-medium">Current icon</h3>{!current?<p role="status">Loading current icon…</p>:current.error?<p className="text-sm text-amber-800">{current.error}</p>:current.data?.data_url?<img className="size-24 rounded border object-contain p-2" src={current.data.data_url} alt={`Current ${item.label} icon`}/>:<p>{current.data?.fallback_icon?`Built-in icon: ${current.data.fallback_icon}`:"No icon configured."}</p>}</div>{preview&&<div><h3 className="mb-2 font-medium">Reviewed replacement</h3><img className="size-24 rounded border object-contain p-2" src={preview.data_url} alt={`New ${item.label} icon`}/></div>}</div>
   {preview?<><p>Reason: {preview.reason}</p><p className="text-sm">Review expires {new Date(preview.expires_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST.</p><div className="flex gap-3"><Button disabled={busy} onClick={()=>void run(true)}>{attempted?'Retry same icon change':'Confirm icon'}</Button><Button variant="outline" disabled={busy||attempted} onClick={()=>setPreview(null)}>Back to edit</Button></div>{attempted&&<p className="text-sm">Retry to recover an interrupted response. If a fresh review is required, close and refresh the catalog.</p>}</>:<form className="space-y-3" onSubmit={e=>{e.preventDefault();void run();}}>
     <label className="block">Replacement image<input className="mt-2 block" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>select(e.target.files?.[0])}/></label>{filename&&<p className="break-all text-sm">Selected: {filename}</p>}
     <label className="block">Reason for icon change<Textarea className="mt-2 block w-full rounded border p-2" required minLength={10} maxLength={500} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)}/></label>
     <Button disabled={busy||!encoded} type="submit">Preview icon</Button>
   </form>}
   {error&&<p role="alert" className="rounded bg-red-50 p-3 text-red-800">{error}</p>}
 </section>;
}
