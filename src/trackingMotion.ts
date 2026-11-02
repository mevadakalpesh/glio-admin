export type VehicleFrame={lat:number;lng:number;heading:number};
const distance=(a:VehicleFrame,b:VehicleFrame)=>Math.hypot((a.lat-b.lat)*111320,(a.lng-b.lng)*111320*Math.cos(a.lat*Math.PI/180));
// Match the rider's exponential chase; never extrapolate beyond a reported fix.
export function createTrackingMotion(draw:(frame:VehicleFrame|null)=>void){
 let current:VehicleFrame|null=null,target:VehicleFrame|null=null,frame:number|undefined,last=0,tau=2000;
 const tick=(now:number)=>{
  const dt=Math.min(Math.max(now-last,0),100);last=now;
  if(current&&target){
   const f=1-Math.exp(-dt/tau),turn=((target.heading-current.heading+540)%360)-180;
   current={lat:current.lat+(target.lat-current.lat)*f,lng:current.lng+(target.lng-current.lng)*f,heading:(current.heading+turn*(1-Math.exp(-dt/130))+360)%360};
   draw(current);
  }
  frame=requestAnimationFrame(tick);
 };
 return {
  set(next:VehicleFrame|null){
   if(!next){if(frame!==undefined)cancelAnimationFrame(frame);frame=undefined;current=target=null;draw(null);return;}
   if(target&&next.lat===target.lat&&next.lng===target.lng&&next.heading===target.heading)return;
   // First fix/reacquisition and large discontinuities must not animate a false journey.
   if(!current||!target||distance(current,next)>500){current={...next};draw(current);}
   tau=target&&distance(target,next)<5?300:2000;
   target={...next};
   if(frame===undefined){last=performance.now();frame=requestAnimationFrame(tick);}
  },
  stop(){if(frame!==undefined)cancelAnimationFrame(frame);frame=undefined;current=target=null;}
 };
}
