import {Input} from '@/components/ui/input';
import {useEffect,useRef,useState} from 'react';
import {useAuth} from './useAuth';
import {api} from './api';
import {Button} from '@/components/ui/button';
type Contact={phone:string|null;dial_code:string|null;email:string|null;viewed_at:string};
export function PersonContact({id}:{id:string}){const {session}=useAuth();return session?.staff.permissions.includes('people.contact.read')?<ContactView key={`${id}:${session.staff.id}:${session.csrf_token}`} id={id}/>:null;}
function ContactView({id}:{id:string}){
 const {session}=useAuth(),[reason,setReason]=useState(''),[data,setData]=useState<Contact|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),pending=useRef<AbortController|null>(null);
 function hide(){pending.current?.abort();pending.current=null;setData(null);setReason('');setError('');setBusy(false);}
 useEffect(()=>{const hidden=()=>{if(document.hidden)hide();};document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',hide);return()=>{pending.current?.abort();pending.current=null;document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',hide);};},[]);
 useEffect(()=>{if(!data)return;const timer=setTimeout(hide,60000);return()=>clearTimeout(timer);},[data]);
 async function reveal(){if(!session||pending.current||reason.trim().length<10||document.hidden)return;const controller=new AbortController();pending.current=controller;setBusy(true);setError('');setData(null);
 try{const value=await api<Contact>(`/people/${id}/contact`,{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{reason:reason.trim()}});if(pending.current!==controller||document.hidden)return;
 if(!value||!Number.isFinite(Date.parse(value.viewed_at))||['phone','dial_code','email'].some(k=>{const v=value[k as keyof Contact];return v!==null&&(typeof v!=='string'||v.length>255);}))throw Error('Invalid contact response');setData(value);setReason('');
 }catch{if(pending.current===controller)setError('Contact details could not be opened. Refresh your session and try again.');}finally{if(pending.current===controller){pending.current=null;setBusy(false);}}}
 return <section className="mt-5 space-y-3 rounded-xl border bg-white p-5" aria-label="Protected customer contact"><h3 className="font-semibold">Protected contact details</h3><p className="text-sm text-slate-600">Owner access is recorded. Use only for this customer’s support or safety needs. Details hide after one minute or when this page is backgrounded.</p>{data?<><dl><dt>Phone</dt><dd>{data.phone?(data.phone.startsWith('+')?data.phone:`${data.dial_code?'+'+data.dial_code+' ':''}${data.phone}`):'Not available'}</dd><dt>Email</dt><dd>{data.email||'Not available'}</dd></dl><Button variant="outline" onClick={hide}>Hide contact details</Button></>:<><label className="block">Contact-access reason<Input maxLength={500} className="mt-1 block w-full rounded border p-2" value={reason} disabled={busy} onChange={e=>setReason(e.target.value)}/></label><Button disabled={busy||reason.trim().length<10} onClick={()=>void reveal()}>{busy?'Opening contact…':'Reveal contact details'}</Button>{busy&&<Button variant="outline" onClick={hide}>Cancel</Button>}</>}{error&&<p role="alert">{error}</p>}</section>;
}
