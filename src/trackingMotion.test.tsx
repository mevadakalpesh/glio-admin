import {it,expect,vi,afterEach} from 'vitest';
import {createTrackingMotion,type VehicleFrame} from './trackingMotion';
afterEach(()=>vi.unstubAllGlobals());
function setup(){
 let callback:FrameRequestCallback=()=>{};
 vi.stubGlobal('requestAnimationFrame',vi.fn((fn:FrameRequestCallback)=>{callback=fn;return 1;}));
 vi.stubGlobal('cancelAnimationFrame',vi.fn());
 const draw=vi.fn(),motion=createTrackingMotion(draw);let time=performance.now();
 return {draw,motion,advance:(ms:number)=>{for(let n=0;n<ms;n+=50){time+=50;callback(time);}}};
}
it('moves gradually and turns across north using the shortest rotation',()=>{
 const {draw,motion,advance}=setup();
 motion.set({lat:23,lng:71,heading:350});
 motion.set({lat:23.001,lng:71,heading:10});
 expect(draw.mock.lastCall?.[0].lat).toBe(23);
 advance(500);
 const halfway=draw.mock.lastCall?.[0] as VehicleFrame;
 expect(halfway.lat).toBeGreaterThan(23);expect(halfway.lat).toBeLessThan(23.001);
 expect(halfway.heading<15||halfway.heading>345).toBe(true);
 motion.set({lat:23.0015,lng:71,heading:20});advance(100);
 expect(draw.mock.lastCall?.[0].lat).toBeGreaterThan(halfway.lat);
 expect(draw.mock.lastCall?.[0].lat).toBeLessThan(23.0015);
 motion.stop();expect(cancelAnimationFrame).toHaveBeenCalled();
});
it('duplicate polling does not accelerate movement; stale fixes hide and reacquire immediately',()=>{
 const {draw,motion,advance}=setup();
 const target={lat:23.001,lng:71,heading:0};
 motion.set({lat:23,lng:71,heading:0});motion.set(target);advance(500);
 motion.set(target);advance(500);
 expect(draw.mock.lastCall?.[0].lat).toBeCloseTo(23+0.001*(1-Math.exp(-0.5)),7);
 motion.set(null);expect(draw.mock.lastCall?.[0]).toBeNull();
 motion.set(target);expect(draw.mock.lastCall?.[0]).toEqual(target);motion.stop();
});
it('does not animate a large GPS jump across unrelated streets',()=>{
 const {draw,motion}=setup();motion.set({lat:23,lng:71,heading:0});
 const next={lat:24,lng:72,heading:90};motion.set(next);
 expect(draw.mock.lastCall?.[0]).toEqual(next);motion.stop();
});
