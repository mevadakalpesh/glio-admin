import {useEffect,useRef,useState} from 'react';
import {api} from './api';
import {useAuth} from './useAuth';
import {Button} from '@/components/ui/button';
type Entry={id:string;body:string;created_at:string;action?:string};
type History={items:Entry[];has_more:boolean;next_before:string|null};
export function SupportTicketHistory({id,kind,before,reason}:{id:string;kind:'notes'|'updates';before:string;reason:string}){
 const {session}=useAuth(),[items,setItems]=useState<Entry[]>([]),[cursor,setCursor]=useState<string|null>(before),[busy,setBusy]=useState(false),[error,setError]=useState(''),pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 async function load(){if(!session||!cursor||pending.current)return;const controller=new AbortController();pending.current=controller;setBusy(true);setError('');try{const result=await api<History>(`/support-tickets/${encodeURIComponent(id)}/history`,{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{kind,before:cursor,reason}});if(pending.current!==controller)return;setItems(old=>{const seen=new Set(old.map(i=>i.id));return [...old,...result.items.filter(i=>!seen.has(i.id))];});setCursor(result.has_more?result.next_before:null);}catch(e){if(pending.current===controller){setItems([]);setCursor(before);setError(e instanceof Error?e.message:'History unavailable.');}}finally{if(pending.current===controller){pending.current=null;setBusy(false);}}}
 return <div className="space-y-2">{items.map(n=><article key={n.id} className="border-t py-2"><p className="text-xs">{kind==='notes'?'Internal staff note':n.action==='customer_attachment'?'Customer · photo added':n.action==='customer_close'?'Customer · confirmed resolved':n.action==='customer_reply'?'Customer':'Gilo support · '+n.action} · {new Date(n.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</p><p className="whitespace-pre-wrap break-words text-sm">{n.body}</p></article>)}{error&&<p role="alert">{error}</p>}{cursor?<Button variant="outline" disabled={busy} onClick={()=>void load()}>{busy?'Loading older history…':kind==='notes'?'Load older internal notes':'Load older customer updates'}</Button>:<p className="text-xs">All {kind==='notes'?'internal notes':'customer updates'} loaded.</p>}</div>;
}
