type Point={lat:number;lng:number};
// Split at the closest point on the road, never draw a shortcut to the GPS fix.
export function splitTrackingRoute(path:Point[],position:Point|null){
 if(!position||path.length<2)return {passed:[],remaining:path};
 const scale=Math.cos(position.lat*Math.PI/180);
 let best=Infinity,index=0,fraction=0;
 for(let i=0;i<path.length-1;i++){
  const a=path[i],b=path[i+1],dx=(b.lng-a.lng)*scale,dy=b.lat-a.lat;
  const x=(position.lng-a.lng)*scale,y=position.lat-a.lat;
  const length=dx*dx+dy*dy;
  const t=length?Math.max(0,Math.min(1,(x*dx+y*dy)/length)):0;
  const distance=(x-t*dx)**2+(y-t*dy)**2;
  if(distance<best){best=distance;index=i;fraction=t;}
 }
 // Off-route or unavailable GPS must not imply completed road segments.
 if(Math.sqrt(best)*111320>300)return {passed:[],remaining:path};
 const a=path[index],b=path[index+1];
 const split={lat:a.lat+(b.lat-a.lat)*fraction,lng:a.lng+(b.lng-a.lng)*fraction};
 return {passed:[...path.slice(0,index+1),split],remaining:[split,...path.slice(index+1)]};
}
