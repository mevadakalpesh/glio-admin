/// <reference types="google.maps" />
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {loadTrackingMap} from './trackingMapLoader';
import type {PlaybackPoint} from './trackingPlayback';
export function TrackingStreetMap({points,index,live=false}:{points:PlaybackPoint[];index:number;live?:boolean}){
 const [initial]=useState(points);
 const drawingPoints=live?initial:points;
 const element=useRef<HTMLDivElement>(null),map=useRef<google.maps.Map|null>(null),marker=useRef<google.maps.Circle|null>(null);
 const [ready,setReady]=useState(false),[error,setError]=useState('');
 const key=import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY?.trim()||'';
 useEffect(()=>{
  if(!key||!element.current||!drawingPoints.length)return;
  let active=true;let settled=false;const lines:google.maps.Polyline[]=[];
  const timer=window.setTimeout(()=>{if(active&&!settled){settled=true;setError('The street map took too long to load. Reopen the map to retry; recorded coordinates remain available.');}},15000);
  const failed=()=>{if(active){settled=true;window.clearTimeout(timer);setError('The street map could not be authorized. Ask an owner to check the Google Maps browser configuration.');setReady(false);}};
  window.addEventListener('gilo-map-auth-failure',failed);
  loadTrackingMap(key).then(library=>{
   if(!active||settled||!element.current)return;
   settled=true;window.clearTimeout(timer);
   const first=drawingPoints[0],instance=new library.Map(element.current,{center:{lat:first.latitude!,lng:first.longitude!},zoom:14,streetViewControl:false,mapTypeControl:false,fullscreenControl:true,gestureHandling:'cooperative'});
   map.current=instance;
   const bounds=new library.LatLngBounds();
   const segments:{lat:number;lng:number}[][]=[];
   for(const point of drawingPoints){
    const position={lat:point.latitude!,lng:point.longitude!};bounds.extend(position);
    if(!segments.length||point.gap)segments.push([]);segments[segments.length-1].push(position);
   }
   for(const path of segments)if(path.length>1)lines.push(new library.Polyline({map:instance,path,strokeColor:'#2563eb',strokeOpacity:0.85,strokeWeight:4,clickable:false}));
   if(drawingPoints.length>1)instance.fitBounds(bounds,40);
   marker.current=new library.Circle({map:instance,center:{lat:first.latitude!,lng:first.longitude!},radius:12,fillColor:'#059669',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:3,clickable:false});
   setReady(true);
  }).catch(()=>{window.clearTimeout(timer);settled=true;if(active)setError('The street map is unavailable. Recorded coordinates remain available.');});
  return ()=>{active=false;window.clearTimeout(timer);window.removeEventListener('gilo-map-auth-failure',failed);lines.forEach(line=>line.setMap(null));marker.current?.setMap(null);marker.current=null;map.current=null;};
 },[key,drawingPoints]);
 useEffect(()=>{const point=points[index];if(ready&&point)marker.current?.setCenter({lat:point.latitude!,lng:point.longitude!});},[ready,index,points]);
 if(!key)return <p role="status" className="rounded-lg bg-amber-50 p-4 text-sm">Google Maps is not configured for Gilo Admin. Configure the Google Maps browser key and enable Maps JavaScript API to display the map. Recorded coordinates remain available.</p>;
 return <section className="space-y-2" aria-label="Recorded positions on street map">
  <p className="text-xs text-slate-600">{live?'Latest reported location, refreshed every 30 seconds. This is not continuous GPS tracking or proof of physical presence.':'Blue lines join samples in this loaded recording; they are not verified driving directions. The green marker is the selected recorded sample, not a live location.'}</p>
  {error?<p role="alert" className="rounded-lg bg-amber-50 p-4 text-sm">{error}</p>:<>{!ready&&<p role="status">Loading street map…</p>}<div ref={element} className="h-80 w-full rounded-lg border" aria-label="Google street map"/></>}
  <Button variant="outline" disabled={!ready||!!error} onClick={()=>{const point=points[index];if(point)map.current?.panTo({lat:point.latitude!,lng:point.longitude!});}}>Center selected sample</Button>
 </section>;
}
