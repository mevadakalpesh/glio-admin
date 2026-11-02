import {it,expect} from 'vitest';
import {splitTrackingRoute} from './trackingRouteSplit';
const path=[{lat:23,lng:71},{lat:23,lng:71.01},{lat:23.01,lng:71.01}];
it('splits inside a segment with a shared boundary and retains route order',()=>{
 const result=splitTrackingRoute(path,{lat:23,lng:71.005});
 expect(result.passed).toEqual([path[0],{lat:23,lng:71.005}]);
 expect(result.remaining).toEqual([{lat:23,lng:71.005},path[1],path[2]]);
});
it('does not infer progress with missing or off-route GPS',()=>{
 expect(splitTrackingRoute(path,null)).toEqual({passed:[],remaining:path});
 expect(splitTrackingRoute(path,{lat:24,lng:72})).toEqual({passed:[],remaining:path});
});
it('handles destination and duplicate coordinates',()=>{
 const result=splitTrackingRoute([path[0],...path],path[2]);
 expect(result.passed.at(-1)).toEqual(path[2]);
 expect(result.remaining.every(point=>point.lat===23.01&&point.lng===71.01)).toBe(true);
});
