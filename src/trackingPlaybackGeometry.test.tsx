import {it,expect} from 'vitest';
import {playbackPoints} from './trackingPlayback';
const sample=(id:string,time:string,lat:number|null=23,lng:number|null=71)=>({id,recorded_at:time,latitude:lat,longitude:lng,heading:null});
it('orders records chronologically and preserves real zero coordinates',()=>{
 const points=playbackPoints([sample('b','2026-10-20T00:00:10Z',0,0),sample('a','2026-10-20T00:00:00Z',0,0)]);
 expect(points.map(p=>p.id)).toEqual(['a','b']);expect(points.every(p=>p.x===300&&p.y===190)).toBe(true);
 expect(points[1].gap).toBe(false);
});
it('excludes invalid samples rather than inventing coordinates',()=>{
 const points=playbackPoints([sample('a','bad'),sample('b','2026-10-20',91),sample('c','2026-10-20',23,null),sample('d','2026-10-20',NaN),sample('e','2026-10-20',23,181)]);
 expect(points).toEqual([]);
});
it('does not connect recording gaps, impossible jumps or moving duplicate timestamps',()=>{
 expect(playbackPoints([sample('a','2026-10-20T00:00:00Z'),sample('b','2026-10-20T00:03:00Z')])[1].gap).toBe(true);
 expect(playbackPoints([sample('a','2026-10-20T00:00:00Z'),sample('b','2026-10-20T00:00:01Z',24)])[1].gap).toBe(true);
 expect(playbackPoints([sample('a','2026-10-20T00:00:00Z'),sample('b','2026-10-20T00:00:00Z',24)])[1].gap).toBe(true);
 expect(playbackPoints([sample('a','2026-10-20T00:00:00Z'),sample('b','2026-10-20T00:01:00Z',23.001)])[1].gap).toBe(false);
});
it('keeps polar/date-line coordinate previews finite and within bounds',()=>{
 const points=playbackPoints([sample('a','2026-10-20T00:00:00Z',89.9,179.999),sample('b','2026-10-20T00:00:30Z',90,-179.999)]);
 for(const p of points){expect(Number.isFinite(p.x)&&Number.isFinite(p.y)).toBe(true);expect(p.x).toBeGreaterThanOrEqual(0);expect(p.x).toBeLessThanOrEqual(600);expect(p.y).toBeGreaterThanOrEqual(0);expect(p.y).toBeLessThanOrEqual(380);}
});
