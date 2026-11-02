import {splitTrackingRoute} from './trackingRouteSplit';
import {createTrackingMotion} from './trackingMotion';
import {useEffect,useRef,useState} from 'react';
import {LocateFixed,Route} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {loadTrackingMap} from './trackingMapLoader';
import type {RecordedSample} from './trackingPlayback';
export type TrackingStop={id:string;ride_id:string;kind:'pickup'|'drop';recorded_at?:string|null;scheduled_at?:string|null;latitude:number;longitude:number;label:string;address:string;status:string};
export type RouteSnapshot={navigation_status?:'detour'|'unavailable';navigation_coordinates?:number[][];coordinates:number[][];total_km:number|null;remaining_km:number|null;remaining_minutes:number|null;progress_percent:number|null;estimate_basis:string};
export function OperationalMap({route,position,vehicle,stops=[]}:{stops?:TrackingStop[];route?:RouteSnapshot;position?:RecordedSample;vehicle?:string}){
 const element=useRef<HTMLDivElement>(null),map=useRef<google.maps.Map|null>(null),update=useRef<(()=>void)|null>(null);
 const latest=useRef({route,position,vehicle,stops});latest.current={route,position,vehicle,stops};
 const following=useRef(true),animatedPosition=useRef<{lat:number;lng:number}|null>(null);
 const [isFollowing,setIsFollowing]=useState(true);
 const resumeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const clearResume=()=>{if(resumeTimer.current!==null){clearTimeout(resumeTimer.current);resumeTimer.current=null;}};
 const resumeFollow=()=>{clearResume();following.current=true;setIsFollowing(true);if(animatedPosition.current)map.current?.setCenter(animatedPosition.current);};
 const pauseFollow=()=>{clearResume();following.current=false;setIsFollowing(false);};
 const [error,setError]=useState(''),[ready,setReady]=useState(false);
 const key=import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY?.trim();
 useEffect(()=>{
  if(!key||!element.current)return;
  let disposed=false,settled=false;const cleanups:(()=>void)[]=[];
  const fail=()=>{setReady(false);setError('Google Maps could not load. Check Maps JavaScript API and the browser key’s website restrictions.');};
  const timer=setTimeout(()=>{if(!settled&&!disposed){settled=true;fail();}},15000);
  window.addEventListener('gilo-map-auth-failure',fail);
  loadTrackingMap(key).then(lib=>{
   if(disposed||settled)return;settled=true;clearTimeout(timer);
   const instance=new lib.Map(element.current!,{center:latest.current.route?.coordinates[0]?{lat:latest.current.route.coordinates[0][1],lng:latest.current.route.coordinates[0][0]}:{lat:20,lng:78},zoom:5,mapTypeControl:false,streetViewControl:false,fullscreenControl:false,gestureHandling:'greedy'});map.current=instance;
   const line=new lib.Polyline({map:instance,strokeColor:'#2563eb',strokeWeight:6,strokeOpacity:0.95});
   const detourLine=new lib.Polyline({map:instance,strokeColor:'#7c3aed',strokeWeight:6,strokeOpacity:0.95,zIndex:3});
   const passedLine=new lib.Polyline({map:instance,strokeColor:'#9CA3AF',strokeWeight:6,strokeOpacity:0.85,zIndex:1});
   let routePath:{lat:number;lng:number}[]=[];
   const drawRoute=(point:{lat:number;lng:number}|null)=>{const split=splitTrackingRoute(routePath,point);passedLine.setPath(split.passed);line.setPath(split.remaining);};
   let fitted=false;
   class Pin extends lib.OverlayView{
    node=document.createElement('div');point:{lat:number;lng:number}|null=null;angle:number|null=null;
    label:string;color:string;traveler:boolean;kind:string;
    constructor(label:string,color:string,traveler=false,kind='start'){super();this.kind=kind;this.label=label;this.color=color;this.traveler=traveler;this.node.style.cssText='position:absolute;transform:translate(-50%,-50%);pointer-events:none;';this.node.style.width=traveler?'56px':'34px';this.node.style.height=traveler?'64px':'44px';this.node.style.zIndex=traveler?'30':'10';this.node.setAttribute('aria-label',label);if(!traveler){this.node.style.transform='translate(-50%,-100%)';this.node.style.pointerEvents='auto';}this.setMap(instance);}
    onAdd(){this.getPanes()?.overlayMouseTarget.appendChild(this.node);this.draw();}
    draw(){if(!this.point){this.node.style.display='none';return;}const projection=this.getProjection();if(!projection)return;const p=projection.fromLatLngToDivPixel(new google.maps.LatLng(this.point));if(!p)return;this.node.style.display='block';this.node.style.left=`${p.x}px`;this.node.style.top=`${p.y}px`;const child=this.node.firstElementChild as HTMLElement|null;if(child&&this.traveler)child.style.transform=`rotate(${(this.angle??0)-(instance.getHeading()||0)}deg)`;}
    onRemove(){this.node.remove();}
    render(point:{lat:number;lng:number}|null,heading:number|null=null){this.point=point;this.angle=heading;this.node.replaceChildren();if(this.traveler){if(/bike|scooter|motorcycle/i.test(latest.current.vehicle||'')){const img=document.createElement('img');img.src='/tracking/traveler-bike.png';img.alt='Traveler vehicle';img.style.cssText='display:block;max-width:none;width:56px;height:64px;object-fit:contain;filter:drop-shadow(0 3px 5px #0005)';this.node.appendChild(img);}else{const arrow=document.createElement('div');arrow.textContent='▲';arrow.style.cssText='font-size:38px;color:#047857;text-shadow:0 0 4px white';this.node.appendChild(arrow);}}else{const pin=document.createElement('img');pin.src=`/tracking/tracking-${this.kind}.png`;pin.alt=this.label;pin.style.cssText='display:block;max-width:none;width:34px;height:44px;object-fit:contain;filter:drop-shadow(0 2px 3px #0003)';this.node.appendChild(pin);const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',this.label);button.style.cssText='position:absolute;inset:0;width:100%;height:100%;cursor:pointer';button.onclick=()=>{const old=this.node.querySelector('[data-callout]');if(old){old.remove();this.node.style.zIndex='10';return;}this.node.style.zIndex='40';const card=document.createElement('div');card.dataset.callout='true';card.textContent=this.label;card.style.cssText=`position:absolute;bottom:50px;left:50%;transform:translateX(-50%);background:white;border-left:4px solid ${this.color};border-radius:10px;padding:10px;width:220px;box-shadow:0 3px 12px #0003;font-size:12px;color:#172033;white-space:normal`;this.node.appendChild(card);};this.node.appendChild(button);}this.draw();}
   }
   const start=new Pin('Trip start','#3B82F6',false,'start'),end=new Pin('Trip destination','#EF4444',false,'destination'),traveler=new Pin('Traveler','#059669',true);
   const motion=createTrackingMotion(value=>{traveler.point=value?{lat:value.lat,lng:value.lng}:null;traveler.angle=value?.heading??null;animatedPosition.current=traveler.point;drawRoute(traveler.point);if(value&&following.current)instance.setCenter({lat:value.lat,lng:value.lng});traveler.draw();});
   let vehicleRendered:string|undefined;
   const ridePins=new Map<string,Pin>();
   update.current=()=>{
    const current=latest.current,path=current.route?.coordinates.map(p=>({lat:p[1],lng:p[0]}))||[];
    detourLine.setPath((current.route?.navigation_coordinates||[]).map(p=>({lat:p[1],lng:p[0]})));
    routePath=path;drawRoute(current.position?animatedPosition.current:null);start.render(path[0]||null);end.render(path.at(-1)||null);
    const ids=new Set(current.stops.map(stop=>stop.id));for(const [id,pin] of ridePins){if(!ids.has(id)){pin.setMap(null);ridePins.delete(id);}}
    for(const stop of current.stops){let pin=ridePins.get(stop.id);if(!pin){pin=new Pin(stop.label,stop.kind==='pickup'?'#10B981':'#F97316',false,stop.kind);ridePins.set(stop.id,pin);}pin.label=`${stop.label} · ${stop.address} · ${stop.status}`;pin.render({lat:stop.latitude,lng:stop.longitude});}
    const sample=current.position;
    if(!traveler.node.firstElementChild||vehicleRendered!==current.vehicle){traveler.render(traveler.point,traveler.angle);vehicleRendered=current.vehicle;}
    motion.set(sample&&sample.latitude!==null&&sample.longitude!==null?{lat:sample.latitude,lng:sample.longitude,heading:sample.heading??traveler.angle??0}:null);
    if(!fitted&&(path.length||sample)){const bounds=new lib.LatLngBounds();path.forEach(p=>bounds.extend(p));current.stops.forEach(p=>bounds.extend({lat:p.latitude,lng:p.longitude}));if(sample?.latitude!=null&&sample.longitude!=null)bounds.extend({lat:sample.latitude,lng:sample.longitude});if(following.current&&sample?.latitude!=null&&sample.longitude!=null){instance.setZoom(16);instance.setCenter({lat:sample.latitude,lng:sample.longitude});}else instance.fitBounds(bounds,70);fitted=true;}
   };
   const listener=instance.addListener('heading_changed',()=>traveler.draw());
   const drag=instance.addListener('dragstart',pauseFollow);
   const dragEnd=instance.addListener('dragend',()=>{clearResume();resumeTimer.current=setTimeout(resumeFollow,3000);});
   const resize=typeof ResizeObserver==='undefined'?null:new ResizeObserver(()=>{if(following.current&&animatedPosition.current)instance.setCenter(animatedPosition.current);traveler.draw();});
   resize?.observe(element.current!);
   cleanups.push(()=>{clearResume();resize?.disconnect();motion.stop();listener.remove();drag.remove();dragEnd.remove();animatedPosition.current=null;ridePins.forEach(pin=>pin.setMap(null));line.setMap(null);detourLine.setMap(null);passedLine.setMap(null);start.setMap(null);end.setMap(null);traveler.setMap(null);});
   update.current();setReady(true);
  }).catch(()=>{settled=true;clearTimeout(timer);if(!disposed)fail();});
  return()=>{disposed=true;clearTimeout(timer);window.removeEventListener('gilo-map-auth-failure',fail);cleanups.forEach(fn=>fn());update.current=null;map.current=null;};
 },[key]);
 useEffect(()=>{update.current?.();},[route,position,vehicle,stops]);
 function fit(){pauseFollow();const bounds=new google.maps.LatLngBounds();stops.forEach(p=>bounds.extend({lat:p.latitude,lng:p.longitude}));route?.navigation_coordinates?.forEach(p=>bounds.extend({lat:p[1],lng:p[0]}));route?.coordinates.forEach(p=>bounds.extend({lat:p[1],lng:p[0]}));if(position?.latitude!=null&&position.longitude!=null)bounds.extend({lat:position.latitude,lng:position.longitude});if(!bounds.isEmpty())map.current?.fitBounds(bounds,70);}
 return <div className="relative h-full min-h-0 overflow-hidden bg-slate-100"><div ref={element} className="absolute inset-0" aria-label="Trip route and traveler map"/>
 {(!key||error||!ready)&&<div role="status" className="absolute left-4 right-4 top-4 rounded-xl border bg-white p-4 shadow-sm">{!key?'Google Maps browser key is not configured.':error||'Loading Google Maps…'}</div>}
 <div className="absolute right-4 top-24 flex flex-col gap-2"><Button size="icon" variant="outline" className="bg-white shadow" title={isFollowing?"Following traveler":"Resume following traveler"} aria-label="Center traveler" aria-pressed={isFollowing} disabled={!ready||!position} onClick={resumeFollow}><LocateFixed className={isFollowing?"text-emerald-600":""}/></Button><Button size="icon" variant="outline" className="bg-white shadow" aria-label="Show entire route" title="Show entire route" disabled={!ready} onClick={fit}><Route/></Button></div>
 {ready&&!error&&!route?.coordinates.length&&<p role="status" className="absolute left-4 top-4 rounded-lg bg-white p-3 text-sm shadow">No planned route is recorded for this trip.</p>}
 <div className="absolute bottom-8 left-3 rounded-lg bg-white/95 px-3 py-2 text-xs shadow">{isFollowing?"Following traveler · ":"Tap center to follow · "}{route?.navigation_status==='detour'?'Purple: return to selected route · ':route?.navigation_status==='unavailable'?'Return route unavailable · ':''}Grey route: traveled · Blue route: remaining · Blue pin: trip start · Green: pickup · Orange: drop-off · Red: trip end</div>
 </div>;
}
