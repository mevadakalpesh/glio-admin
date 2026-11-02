export type RecordedSample = {id:string;latitude:number|null;longitude:number|null;heading:number|null;recorded_at:string|null};
export type PlaybackPoint = RecordedSample & {timestamp:number;x:number;y:number;gap:boolean};
export function playbackPoints(samples:RecordedSample[]):PlaybackPoint[]{
 const valid=samples.filter(sample=>typeof sample.latitude==='number'&&Number.isFinite(sample.latitude)&&Math.abs(sample.latitude)<=90&&typeof sample.longitude==='number'&&Number.isFinite(sample.longitude)&&Math.abs(sample.longitude)<=180&&sample.recorded_at&&Number.isFinite(Date.parse(sample.recorded_at)))
  .map(sample=>({...sample,timestamp:Date.parse(sample.recorded_at!)})).sort((a,b)=>a.timestamp-b.timestamp||a.id.localeCompare(b.id));
 if(!valid.length)return [];
 // Unwrap at the date line; this is a coordinate preview, not a road-map projection.
 const origin=valid[0].longitude!;
 const unwrapped=valid.map(p=>{let longitude=p.longitude!;while(longitude-origin>180)longitude-=360;while(longitude-origin< -180)longitude+=360;return longitude;});
 const latitudes=valid.map(p=>p.latitude!);
 const minX=Math.min(...unwrapped),maxX=Math.max(...unwrapped),minY=Math.min(...latitudes),maxY=Math.max(...latitudes);
 const cosine=Math.max(0.01,Math.cos((minY+maxY)/2*Math.PI/180));
 const span=Math.max((maxX-minX)*cosine,maxY-minY,0.0001);
 return valid.map((point,index)=>{
  const previous=valid[index-1],dt=previous?(point.timestamp-previous.timestamp)/1000:0;
  let gap=false;
  if(previous){
   const rad=Math.PI/180,dlat=(point.latitude!-previous.latitude!)*rad,dlng=(unwrapped[index]-unwrapped[index-1])*rad;
   const a=Math.sin(dlat/2)**2+Math.cos(previous.latitude!*rad)*Math.cos(point.latitude!*rad)*Math.sin(dlng/2)**2;
   const metres=6371000*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,a))));
   // Conservative display-only discontinuities, never an anti-fraud verdict.
   gap=dt>120||(dt<=0&&metres>1)||(dt>0&&metres/dt>60);
  }
  return {...point,x:300+(unwrapped[index]-(minX+maxX)/2)*cosine/span*320,y:190-(point.latitude!-(minY+maxY)/2)/span*320,gap};
 });
}
