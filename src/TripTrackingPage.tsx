import {useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowLeft,RefreshCw,PanelRightClose,PanelRightOpen,History,User,Route,MapPinOff,Flag,Clock} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {TrackingLive} from './TrackingLive';
import {TrackingInspection} from './TrackingInspection';
import type {TripOperationsData} from './TripOperations';
import {useVisibleSnapshot} from './useVisibleSnapshot';
import {useAuth} from './useAuth';
type Detail={journey:{reference:string;status_label:string;origin:{city?:string;state?:string}|null;destination:{city?:string;state?:string}|null;departure_at?:string;trip_started_at?:string;trip_completed_at?:string;available_seats?:number;seats_booked?:number;estimated_eta_hours?:string};operations?:TripOperationsData};
const time=(v?:string|null)=>v?new Date(v).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}):'Not recorded';
export function TripTrackingPage({id}:{id:string}){
 const {session}=useAuth();
 return session?.staff.permissions.includes('journeys.read')&&session.staff.permissions.includes('tracking.evidence.read')?<TripTrackingContent key={id} id={id}/>:<p>You do not have access to this trip tracking page.</p>;
}
function TripTrackingContent({id}:{id:string}){
 const {session}=useAuth(),permissions=session?.staff.permissions||[];
 const [page,setPage]=useState(1),[sidebar,setSidebar]=useState(true),[history,setHistory]=useState(false);
 const {result,refresh}=useVisibleSnapshot<Detail>(`/journeys/trips/${encodeURIComponent(id)}?linked_page=${page}`,30000,true);
 const data=result?.data,trip=data?.journey,ops=data?.operations;
 const place=(value:Detail['journey']['origin'])=>[value?.city,value?.state].filter(Boolean).join(', ')||'Area not recorded';
 const active=!!trip&&['STARTED','PICKING UP','ON THE WAY','RETURNING'].includes(trip.status_label);
 return <section className="fixed inset-0 z-40 flex flex-col bg-background" aria-label="Full screen trip tracking">
 <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3"><div className="flex items-center gap-3"><Button size="icon" variant="outline" aria-label="Back to live operations" render={<Link to="/tracking"/>}><ArrowLeft size={18}/></Button><div><h1 className="text-lg font-semibold">Gilo · {trip?.reference||'Trip tracking'}</h1><p className="text-xs text-muted-foreground">{trip?`${place(trip.origin)} → ${place(trip.destination)}`:'Loading journey…'}</p></div>{trip&&<Badge variant="outline">{trip.status_label}</Badge>}</div><div className="flex items-center gap-2"><Button variant="outline" size="sm" render={<Link to={`/trips?kind=trips&id=${encodeURIComponent(id)}`}/>}>Trip details</Button><Button variant="outline" size="icon" aria-label="Refresh trip" onClick={refresh}><RefreshCw size={16}/></Button><Button variant="outline" size="icon" aria-label={sidebar?'Hide details':'Show details'} onClick={()=>setSidebar(!sidebar)}>{sidebar?<PanelRightClose/>:<PanelRightOpen/>}</Button></div></header>
 {result?.error&&<p role="alert" className="p-4 text-destructive">{result.error}</p>}
 <div className="flex min-h-0 flex-1 flex-col md:flex-row"><main className="min-h-0 min-w-0 flex-1 overflow-hidden bg-muted">
 {trip?(active?<TrackingLive autoStart immersive startedAt={trip.trip_started_at} id={id} vehicle={ops?.vehicle?.label} onClose={()=>{}}/>:<div className="flex h-full min-h-[320px] items-center justify-center overflow-y-auto px-6 py-10">
 <div className="w-full max-w-md text-center" role="status">
 <div className="relative mx-auto mb-6 flex size-24 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50">
 <Route className="size-10 text-emerald-700" strokeWidth={1.5} aria-hidden="true"/>
 <span className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full border-4 border-background bg-white text-muted-foreground">{trip.status_label==='COMPLETED'?<Flag size={18} aria-hidden="true"/>:<MapPinOff size={18} aria-hidden="true"/>}</span>
 </div>
 <h2 className="text-xl font-semibold tracking-tight">{trip.status_label==='COMPLETED'?'Trip completed':trip.status_label==='CANCELLED'?'Trip cancelled':'Live tracking is not active'}</h2>
 <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{trip.status_label==='COMPLETED'?'This journey has ended. View recorded locations to review the route and available location history.':trip.status_label==='CANCELLED'?'Live tracking has ended for this trip. Any recorded locations remain available for review.':'Live tracking appears when the trip is underway. You can review any available recorded locations below.'}</p>
 {trip.trip_completed_at&&<p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground"><Clock size={14} aria-hidden="true"/>{time(trip.trip_completed_at)} IST</p>}
 <Button className="mt-6 gap-2" onClick={()=>setHistory(true)}><History size={16} aria-hidden="true"/>View recorded locations</Button>
 </div>
 </div>):<p role="status" className="p-8">Loading trip details…</p>}
 </main>
 {sidebar&&trip&&<aside className="w-full overflow-y-auto border-l bg-white md:w-[380px] md:shrink-0" aria-label="Journey details"><div className="space-y-6 p-5">
 <section><h2 className="mb-4 flex items-center gap-2 font-semibold"><User size={18}/>Traveler & vehicle</h2><p className="font-medium">{ops?.traveler?.name||'Traveler unavailable'}</p>{ops?.traveler&&permissions.includes('people.read')&&<Link className="text-sm text-emerald-700 underline" to={`/people?id=${encodeURIComponent(ops.traveler.id)}`}>View account</Link>}<dl className="mt-4 grid grid-cols-2 gap-4 text-sm">{Object.entries({'Vehicle':ops?.vehicle?.label||'Not recorded','Pickup service':ops?.delivery_mode==='door_to_door'?'Door to door':ops?.delivery_mode==='road_to_road'?'Roadside pickup':'Not recorded','Available seats':trip.available_seats??'Not recorded','Seats booked':trip.seats_booked??'Not recorded','Trip price / seat':ops?.seat_price!=null?`₹${Number(ops.seat_price).toFixed(2)}`:'Not recorded','Reported delay':ops?.delay_minutes!=null?`${ops.delay_minutes} min`:'Not recorded'}).map(([k,v])=><div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-1 font-medium">{v}</dd></div>)}</dl></section>
 <section className="border-t pt-5"><h2 className="mb-4 flex items-center gap-2 font-semibold"><Route size={18}/>Journey timeline</h2><ol className="space-y-4 border-l-2 border-emerald-100 pl-4 text-sm">{[['Scheduled departure',trip.departure_at],['Trip started',trip.trip_started_at],['Trip completed',trip.trip_completed_at]].map(([label,value])=><li key={label}><p className="font-medium">{label}</p><p className="mt-1 text-xs text-muted-foreground">{time(value)}{value?' IST':''}</p></li>)}</ol><Button className="mt-4 w-full" variant="outline" onClick={()=>setHistory(true)}><History size={16}/>Recorded locations & playback</Button></section>
 <section className="border-t pt-5"><h2 className="font-semibold">Passenger rides <span className="text-muted-foreground">({ops?.linked_rides.total??0})</span></h2><p className="mt-1 text-xs text-muted-foreground">Requests and bookings, shown by status.</p>{!ops&&<p className="py-4 text-sm text-muted-foreground">Passenger information unavailable.</p>}<div className="mt-4 space-y-3">{ops?.linked_rides.items.map(ride=><article key={ride.id} className="space-y-2 rounded-xl border p-3"><div className="flex items-center justify-between gap-2"><Link className="font-medium text-emerald-700" to={`/trips?kind=rides&id=${encodeURIComponent(ride.id)}`}>{ride.reference}</Link><Badge variant="outline">{ride.status_label}</Badge></div><p className="text-sm font-medium">{ride.passenger?.name||'Passenger name unavailable'}</p><p className="text-xs">{place(ride.origin)} → {place(ride.destination)}</p><p className="text-xs text-muted-foreground">Pickup: {time(ride.scheduled_pickup_at||(ride.ride_date&&ride.ride_time?`${ride.ride_date}T${ride.ride_time}+05:30`:null))}</p><div className="flex justify-between text-sm"><span>{ride.passenger_count??'—'} passengers</span><span>{ride.final_amount!=null?`₹${Number(ride.final_amount).toFixed(2)}`:'Fare unavailable'}</span></div><p className="text-xs text-muted-foreground">Funds: {ride.escrow_status||'Not recorded'}</p></article>)}</div>{ops&&!ops.linked_rides.items.length&&<p className="py-5 text-sm text-muted-foreground">No linked passenger rides.</p>}{ops&&ops.linked_rides.total>ops.linked_rides.page_size&&<div className="mt-3 flex justify-between"><Button variant="outline" disabled={page<=1} onClick={()=>setPage(page-1)}>Previous</Button><Button variant="outline" disabled={page*ops.linked_rides.page_size>=ops.linked_rides.total} onClick={()=>setPage(page+1)}>Next</Button></div>}</section>
 </div></aside>}
 </div><Dialog open={history} onOpenChange={setHistory}><DialogContent className="max-w-5xl"><DialogTitle>Recorded journey</DialogTitle><DialogDescription>Location history and playback · India time</DialogDescription><TrackingInspection id={id} historical onClose={()=>setHistory(false)}/></DialogContent></Dialog>
 </section>;
}
