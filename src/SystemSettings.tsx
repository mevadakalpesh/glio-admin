import {Link,useSearchParams} from 'react-router-dom';
import {ArrowUpRight,Search,Settings2} from 'lucide-react';
import {useAuth} from './useAuth';
import {modules} from './modules';
import {VerificationPolicies} from './VerificationPolicies';
import {Policies} from './Policies';
import {IntegrationConfiguration} from './IntegrationConfiguration';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {SegmentedControl,SegmentedItem} from '@/components/ui/segmented-control';
import {useState} from 'react';
const groups=[
 {title:'Journey rules & verification',ids:['policies','verification-settings'],description:'Approval requirements, fares, commission, matching and cancellation rules.'},
 {title:'App content & master data',ids:['master-data','banners','ride-legal-documents','trip-legal-documents'],description:'Shared app options, homepage content and journey agreements.'},
 {title:'Notifications',ids:['verification-templates','cancellation-templates','resume-templates','refund-templates','wallet-credit-templates','resolution-templates','support-templates'],description:'Customer notification wording and guidance.'},
 {title:'Integrations & access',ids:['integration-configuration','access','sessions'],description:'Server configuration visibility, staff permissions and account security.'},
];
export function SystemSettings(){
 const {session}=useAuth(),[params,setParams]=useSearchParams(),[search,setSearch]=useState('');
 const permissions=session?.staff.permissions||[];
 const tabs=[{id:'all',label:'All settings'},...(permissions.includes('policies.read')?[{id:'verification',label:'Verification'},{id:'policies',label:'Journey policies'}]:[]),...(permissions.includes('health.read')?[{id:'integrations',label:'Integrations'}]:[])];
 const requested=params.get('section')||'all',section=tabs.some(t=>t.id===requested)?requested:'all';
 const entries=[...modules,{id:'verification-settings',title:'Verification requirements',description:'Manage identity, selfie and vehicle/licence approval requirements across all environments.',permissions:['policies.read'],icon:Settings2}];
 const allowed=entries.filter(m=>m.id==='sessions'||m.permissions.some(p=>permissions.includes(p)));
 const href=(id:string)=>id==='verification-settings'?'/system-settings?section=verification':id==='policies'?'/system-settings?section=policies':id==='integration-configuration'?'/system-settings?section=integrations':`/${id}`;
 const visible=groups.map(g=>({...g,items:g.ids.map(id=>allowed.find(m=>m.id===id)).filter(m=>m&&`${m.title} ${m.description}`.toLowerCase().includes(search.trim().toLowerCase()))}));
 return <section className="space-y-6"><header><h1 className="text-3xl font-semibold tracking-tight">System Settings</h1><p className="mt-2 text-sm text-muted-foreground">Manage Gilo’s app configuration, journey rules, notifications and access.</p></header>
 <SegmentedControl aria-label="System settings categories">{tabs.map(t=><SegmentedItem key={t.id} aria-pressed={section===t.id} onClick={()=>setParams(t.id==='all'?{}:{section:t.id})}>{t.label}</SegmentedItem>)}</SegmentedControl>
 {section==='verification'?<VerificationPolicies/>:section==='policies'?<Policies/>:section==='integrations'?<IntegrationConfiguration/>:<>
 <div className="relative max-w-sm"><Search size={16} className="absolute left-3 top-3 text-muted-foreground"/><Input aria-label="Search system settings" className="pl-9" placeholder="Search settings…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
 {visible.map(g=>g.items.length>0&&<section key={g.title} className="space-y-3"><div><h2 className="font-semibold">{g.title}</h2><p className="mt-1 text-sm text-muted-foreground">{g.description}</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{g.items.map(m=>m&&<article key={m.id} className="flex flex-col rounded-xl border bg-card p-5"><m.icon size={20} className="mb-4 text-muted-foreground"/><h3 className="font-medium">{m.title}</h3><p className="mb-4 mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{m.description}</p><Button variant="outline" className="self-start" render={<Link to={href(m.id)}/>}>Open {m.title.toLowerCase()}<ArrowUpRight size={14}/></Button></article>)}</div></section>)}
 {!visible.some(g=>g.items.length)&&<p className="rounded-xl border p-8 text-center text-muted-foreground">No settings match your search.</p>}
 </>}
 </section>;
}
