import {useEffect,useRef,useState} from 'react';
import {api} from './api';
import {useAuth} from './useAuth';
import {Button} from '@/components/ui/button';
type Photo={id:string;created_at:string;byte_size:number};
export function SupportAttachments({id,reason}:{id:string;reason:string}){
 const {session}=useAuth(),[items,setItems]=useState<Photo[]|null>(null),[image,setImage]=useState<string|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 async function read(photo?:string){
  if(!session||pending.current)return;
  const c=new AbortController();pending.current=c;setBusy(true);setError('');setImage(null);if(!photo)setItems(null);
  try{
   const result=await api<{items:Photo[];mime:string;image_base64:string}>(`/support-tickets/${encodeURIComponent(id)}/attachments${photo?'/'+encodeURIComponent(photo):''}`,{method:'POST',csrf:session.csrf_token,body:{reason},signal:c.signal});
   if(pending.current!==c)return;
   if(photo){
    if(result.mime!=='image/webp'||typeof result.image_base64!=='string'||result.image_base64.length>700000||!/^[A-Za-z0-9+/]+={0,2}$/.test(result.image_base64))throw Error('Photo response could not be verified.');
    setImage('data:image/webp;base64,'+result.image_base64);
   }else{
    if(!Array.isArray(result.items)||result.items.length>5)throw Error('Photo list could not be verified.');
    setItems(result.items);
   }
  }catch(e){if(pending.current===c)setError(e instanceof Error?e.message:'Support photos unavailable.');}
  finally{if(pending.current===c){pending.current=null;setBusy(false);}}
 }
 function hide(){pending.current?.abort();pending.current=null;setItems(null);setImage(null);setBusy(false);setError('');}
 return <section className="space-y-3 rounded-lg border bg-white p-4"><h3 className="font-semibold">Customer photos · private</h3><p className="text-sm">User-submitted evidence. Viewing is recorded with your ticket inspection reason.</p><div className="flex gap-3"><Button variant="outline" disabled={busy} onClick={()=>void read()}>Load support photos</Button><Button variant="outline" onClick={hide}>Hide support photos</Button></div>{busy&&<p role="status">Loading photos…</p>}{error&&<p role="alert">{error}</p>}{items?.length===0&&<p>No photos attached.</p>}{items?.map((item,index)=><div key={item.id} className="flex flex-wrap items-center gap-3"><span>Photo {index+1} · {new Date(item.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</span><Button variant="outline" disabled={busy} onClick={()=>void read(item.id)}>View support photo {index+1}</Button></div>)}{image&&<img src={image} alt="Customer support evidence" className="max-h-[32rem] max-w-full rounded-lg object-contain"/>}</section>;
}
