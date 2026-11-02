import {AdminTable} from '@/components/ui/admin-table';
import {useState} from 'react';
import {useRead} from './useRead';
import {useAuth} from './useAuth';
import {Button} from '@/components/ui/button';
type Row={id:string;participant:string;type:string;purpose?:string|null;status:string;amount:string|null;balance_before:string|null;balance_after:string|null;created_at:string|null};
type Result={items:Row[];page:number;page_size:number;total:number};
const money=(v:string|null)=>v===null?'Unavailable':`${Number(v)<0?'-':''}₹${Math.abs(Number(v)).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export function SettlementLedger({id}:{id:string}){const {session}=useAuth();return session?.staff.permissions.includes('ledger.read')?<Ledger key={id} id={id}/>:null;}
function Ledger({id}:{id:string}){
 const [page,setPage]=useState(1),[version,setVersion]=useState(0);
 const result=useRead<Result>(`/settlements/${encodeURIComponent(id)}/ledger?page=${page}`,version),data=result?.data;
 return <section className="space-y-4 rounded-xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-semibold">Linked wallet ledger</h2><Button variant="outline" disabled={!result} onClick={()=>setVersion(v=>v+1)}>Refresh ledger</Button></div>
 <p className="text-sm text-slate-600">Read-only entries explicitly linked to this ride escrow and its participant wallets. Historical balances are not current spendable balances. Missing entries do not prove that no payment occurred; older or provider payments may not have this ledger link.</p>
 {!result&&<p role="status">Loading linked ledger…</p>}{result?.error&&<p role="alert">{result.error}</p>}
 {data&&<>{data.items.length===0?<p>No explicitly linked wallet entries were found.</p>:<div className="overflow-x-auto"><AdminTable className="w-full text-left text-sm"><thead><tr>{['Participant','Entry / status','Amount','Balance before','Balance after','Recorded at (IST)'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{data.items.map(row=><tr className="border-t" key={row.id}><td className="p-3">{row.participant}</td><td className="p-3"><div>{row.purpose||row.type.replaceAll('_',' ')}</div><div className="text-xs text-slate-500">{row.type.replaceAll('_',' ')} · {row.status}</div></td><td className="p-3">{money(row.amount)}</td><td className="p-3">{money(row.balance_before)}</td><td className="p-3">{money(row.balance_after)}</td><td className="p-3">{row.created_at&&Number.isFinite(Date.parse(row.created_at))?new Date(row.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}):'Not recorded'}</td></tr>)}</tbody></AdminTable></div>}
 <div className="flex items-center gap-3"><Button variant="outline" disabled={data.page<=1} onClick={()=>setPage(page-1)}>Previous entries</Button><span>Page {data.page}</span><Button variant="outline" disabled={data.page*data.page_size>=data.total} onClick={()=>setPage(page+1)}>Next entries</Button></div></>}
 </section>;
}
