import {useState, type ReactElement} from 'react';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {SegmentedControl, SegmentedItem} from '@/components/ui/segmented-control';
import {Link} from 'react-router-dom';
import {ArrowUpRight, History, LockKeyhole, LockKeyholeOpen, Route, ShieldCheck, UserRound, Users} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent} from '@/components/ui/card';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import {Verification} from './Verification';
import {PersonContact} from './PersonContact';
import {PersonRestriction} from './PersonRestriction';
import {useAuth} from './useAuth';

type Detail = {person:{id:string;name:string;avatar_url?:string|null;phone_masked:string;email_masked:string;role:string;account_status:string|null;is_active:boolean|null;new_journeys_restricted?:boolean|null;created_at:string;updated_at:string};journeys:{trips:number;rides:number};generated_at:string};
const label=(value:string|null)=>value?value.replaceAll('_',' ').replace(/^./,s=>s.toUpperCase()):'Not recorded';
const time=(value:string)=>value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(value)):'Not recorded';
function HeaderAction({label,description,children}:{label:string;description:string;children:ReactElement}) {
 return <Tooltip><TooltipTrigger render={children} aria-label={label}/><TooltipContent><p className="font-medium">{label}</p><p className="mt-1 opacity-80">{description}</p></TooltipContent></Tooltip>;
}
export function PersonOverview({detail,onRefresh}:{detail:Detail;onRefresh:()=>void}) {
 const {session}=useAuth();
 const permissions=session?.staff.permissions||[];
 const can=(permission:string)=>permissions.includes(permission);
 const [action,setAction]=useState<'contact'|'access'|null>(null);
 const person=detail.person;
 const [selectedTab,setSelectedTab]=useState('account');
 const tabs=[{value:'account',label:'Account info'},{value:'actions',label:'Account actions'},...(can('verification.read') ? [...(session?.staff.role==='owner' ? [{value:'documents',label:'Identity documents'},{value:'selfies',label:'Selfies'}] : []),{value:'vehicles',label:'Vehicle & licence'}] : [])];
 const activeTab=tabs.some(tab=>tab.value===selectedTab)?selectedTab:'account';
 const [failedAvatar,setFailedAvatar]=useState<string|null>(null);
 const avatar=person.avatar_url===`/api/admin/v1/people/${person.id}/avatar`?person.avatar_url:null;
 const restricted=person.new_journeys_restricted;
 const links=[
  {permission:'verification.read',title:'Document verification',description:'Review identity, vehicle and licence evidence.',to:`/verification?person=${person.id}`,icon:ShieldCheck},
  {permission:'audit.read',title:'Account audit trail',description:'Inspect recorded staff actions for this account.',to:`/audit?reference=${person.id}`,icon:History},
 ];
 return <div className="space-y-6">
  <Card className="overflow-hidden rounded-2xl shadow-none"><CardContent className="p-0">
   <div className="flex flex-wrap items-center justify-between gap-5 border-b p-6">
    <div className="flex min-w-0 items-center gap-4"><div aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl font-semibold text-emerald-800">{avatar&&failedAvatar!==avatar?<img src={avatar} alt="" className="size-full rounded-2xl object-cover" onError={()=>setFailedAvatar(avatar)}/>:person.name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'?'}</div><div><h2 className="break-words text-2xl font-semibold tracking-tight">{person.name}</h2><div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline" className={person.account_status==='active'?'border-emerald-200 bg-emerald-50 text-emerald-800':''}>{label(person.account_status)}</Badge><Badge variant="secondary">{label(person.role)}</Badge></div></div></div>
    <TooltipProvider><div className="flex flex-wrap items-center gap-2" role="group" aria-label="Customer quick actions">
     {can('people.contact.read')&&<HeaderAction label="Contact details" description="Open protected customer contact information."><Button size="icon" variant="outline" onClick={()=>setAction('contact')}><UserRound size={17}/></Button></HeaderAction>}
     {can('people.restrict')&&<HeaderAction label="Manage access" description={restricted?'Restore access to new journeys after review.':'Suspend new journeys. Existing rides, refunds and support stay accessible.'}><Button size="icon" variant="outline" className={restricted?'text-emerald-700':'text-red-600 hover:text-red-700'} onClick={()=>setAction('access')}>{restricted?<LockKeyholeOpen size={17}/>:<LockKeyhole size={17}/>}</Button></HeaderAction>}
     {can('journeys.read')&&<><HeaderAction label="Traveler trips" description="View this customer’s published trips."><Button size="icon" variant="outline" nativeButton={false} render={<Link to={`/trips?kind=trips&person=${person.id}`}/>}><Route size={17}/></Button></HeaderAction><HeaderAction label="Passenger rides" description="View this customer’s ride bookings."><Button size="icon" variant="outline" nativeButton={false} render={<Link to={`/trips?kind=rides&person=${person.id}`}/>}><Users size={17}/></Button></HeaderAction></>}
     {can('audit.read')&&<HeaderAction label="Account audit history" description="Review recorded staff actions for this account."><Button size="icon" variant="outline" nativeButton={false} render={<Link to={`/audit?reference=${person.id}`}/>}><History size={17}/></Button></HeaderAction>}
    </div></TooltipProvider>
   </div>
   <dl className="grid gap-5 p-6 sm:grid-cols-2 xl:grid-cols-4">{Object.entries({'Account ID':person.id,'Phone':person.phone_masked,'Email':person.email_masked,'Joined (IST)':time(person.created_at)}).map(([name,value])=><div key={name} className="min-w-0"><dt className="text-xs text-muted-foreground">{name}</dt><dd className="mt-2 break-words text-sm font-medium">{value||'Not recorded'}</dd></div>)}</dl>
  </CardContent></Card>
  <SegmentedControl aria-label="Customer detail sections" className="max-w-full flex-wrap">{tabs.map(tab=><SegmentedItem key={tab.value} aria-pressed={activeTab===tab.value} onClick={()=>setSelectedTab(tab.value)}>{tab.label}</SegmentedItem>)}</SegmentedControl>
  {activeTab==='account' ? <div className="space-y-6">
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
   {(['trips','rides'] as const).map(kind=><Card key={kind} className="rounded-2xl shadow-none"><CardContent className="p-5"><div className="flex items-center justify-between text-sm text-muted-foreground"><span>{kind==='trips'?'Traveler trips':'Passenger rides'}</span>{kind==='trips'?<Route size={18}/>:<Users size={18}/>}</div><p className="mt-4 text-3xl font-semibold tabular-nums">{detail.journeys[kind].toLocaleString('en-IN')}</p><p className="mt-1 text-xs text-muted-foreground">{kind==='trips'?'Passenger-capable trips published':'Passenger rides requested'}</p>{can('journeys.read')&&<Button className="mt-4 w-full justify-between" variant="outline" role="link" nativeButton={false} render={<Link to={`/trips?kind=${kind}&person=${person.id}`}/>}>View {kind}<ArrowUpRight size={15}/></Button>}</CardContent></Card>)}
   <Card className="rounded-2xl shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Account access</p><p className="mt-4 text-lg font-semibold">{person.is_active===true?'Enabled':person.is_active===false?'Disabled':'Not recorded'}</p><p className="mt-2 text-sm text-muted-foreground">Recorded account availability. Journey eligibility is checked separately.</p></CardContent></Card>
   <Card className="rounded-2xl shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">New-journey restriction</p><p className={`mt-4 text-lg font-semibold ${restricted===true?'text-amber-700':''}`}>{restricted===true?'Restricted':restricted===false?'Not restricted':'Not recorded'}</p><p className="mt-2 text-sm text-muted-foreground">Existing journeys, tracking, refunds and support remain accessible under this restriction.</p></CardContent></Card>
  </div>
  <div className="grid gap-6 lg:grid-cols-2">
   <Card className="rounded-2xl shadow-none"><CardContent className="p-6"><h3 className="font-semibold">Account record</h3><dl className="mt-4 divide-y">{Object.entries({'Recorded role':label(person.role),'Recorded status':label(person.account_status),'Created (IST)':time(person.created_at),'Last updated (IST)':time(person.updated_at)}).map(([name,value])=><div key={name} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><dt className="text-muted-foreground">{name}</dt><dd className="font-medium">{value}</dd></div>)}</dl></CardContent></Card>
   <Card className="rounded-2xl shadow-none"><CardContent className="p-6"><h3 className="font-semibold">Review & history</h3><p className="mt-2 text-sm text-muted-foreground">Open the relevant record to review evidence and available actions.</p><div className="mt-4 space-y-3">{links.filter(item=>can(item.permission)).map(item=><Link key={item.title} to={item.to} className="flex items-center gap-3 rounded-xl border p-4 hover:bg-muted/40 focus-visible:ring-2"><item.icon size={20} className="shrink-0 text-muted-foreground"/><div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.description}</p></div><ArrowUpRight size={16}/></Link>)}</div><p className="mt-4 text-xs leading-relaxed text-muted-foreground">Account status does not establish identity or driving eligibility. Open a linked ride or trip for its tracking, payment and support records.</p></CardContent></Card>
  </div>
  </div> : activeTab==='actions' ? <div className="grid gap-4 md:grid-cols-2">
   {can('people.restrict')&&<Card className="rounded-2xl shadow-none"><CardContent className="space-y-4 p-6"><div className="flex items-center gap-2"><LockKeyhole size={20}/><h3 className="font-semibold">Journey access</h3></div><Badge variant={restricted?'destructive':'secondary'}>{restricted?'New journeys suspended':'New journeys allowed'}</Badge><p className="text-sm text-muted-foreground">Suspend new rides, trip publication and bookings while keeping existing journeys, tracking, refunds and support accessible. Review active journeys and provide a reason before confirming.</p><Button variant={restricted?'outline':'destructive'} onClick={()=>setAction('access')}>{restricted?'Restore new-journey access':'Suspend new journeys'}</Button></CardContent></Card>}
   {can('people.contact.read')&&<Card className="rounded-2xl shadow-none"><CardContent className="space-y-4 p-6"><h3 className="font-semibold">Customer assistance</h3><p className="text-sm text-muted-foreground">Open protected contact information when helping this customer. Access is recorded.</p><Button variant="outline" onClick={()=>setAction('contact')}>Open contact details</Button></CardContent></Card>}
   {can('journeys.read')&&<Card className="rounded-2xl shadow-none"><CardContent className="space-y-4 p-6"><h3 className="font-semibold">Journey operations</h3><p className="text-sm text-muted-foreground">Open the relevant journey to review tracking, cancellation, payment and dispute actions available for its current state.</p><div className="flex flex-wrap gap-2">{(['trips','rides'] as const).map(kind=><Button key={kind} variant="outline" nativeButton={false} render={<Link to={`/trips?kind=${kind}&person=${person.id}`}/>}>View {kind}</Button>)}</div></CardContent></Card>}
   {can('audit.read')&&<Card className="rounded-2xl shadow-none"><CardContent className="space-y-4 p-6"><h3 className="font-semibold">Account action history</h3><p className="text-sm text-muted-foreground">Review staff actions and recorded access changes for this customer.</p><Button variant="outline" nativeButton={false} render={<Link to={`/audit?reference=${person.id}`}/>}>View audit history</Button></CardContent></Card>}
   {!['people.restrict','people.contact.read','journeys.read','audit.read'].some(can)&&<p className="text-sm text-muted-foreground">Your role has no account actions available.</p>}
  </div> : <section aria-label="Customer verification" className="space-y-4"><Verification key={person.id+activeTab} personId={person.id} category={activeTab as 'documents'|'selfies'|'vehicles'}/></section>}
  <p className="text-xs text-muted-foreground">Updated {time(detail.generated_at)} IST · Trip totals exclude package-only journeys.</p>
  <Dialog open={action!==null} onOpenChange={open=>{if(!open){if(action==='access')onRefresh();setAction(null);}}}><DialogContent className="max-w-2xl"><DialogTitle className="pr-6 text-xl font-semibold">{action==='contact'?'Customer contact':'Manage new-journey access'}</DialogTitle><DialogDescription className="mt-2 text-sm text-muted-foreground">{action==='contact'?'Access contact information for customer support.':'Review the impact before changing this customer’s access.'}</DialogDescription>{action==='contact'&&<PersonContact id={person.id}/>} {action==='access'&&<PersonRestriction id={person.id} restricted={restricted} onChanged={onRefresh}/>}</DialogContent></Dialog>
 </div>;
}
