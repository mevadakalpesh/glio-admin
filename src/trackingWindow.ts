// datetime-local values are explicitly interpreted as India time, never browser time.
export function indiaTimeToUtc(value:string):string|null {
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return null;
 const wall=new Date(value+':00.000Z');
 if(!Number.isFinite(wall.getTime())||wall.toISOString().slice(0,16)!==value)return null;
 return new Date(wall.getTime()-330*60000).toISOString();
}
export function historyBounds(from:string,to:string):{from:string;to:string}|null{
 const start=indiaTimeToUtc(from),end=indiaTimeToUtc(to);
 if(!start||!end)return null;
 const duration=Date.parse(end)-Date.parse(start);
 return duration>0&&duration<=6*3600000?{from:start,to:end}:null;
}
