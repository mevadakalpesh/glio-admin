import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup,fireEvent,act} from '@testing-library/react';
import {TrackingPlayback} from './TrackingPlayback';
const samples=[{id:'b',latitude:23.001,longitude:71,heading:0,recorded_at:'2026-10-20T00:00:30Z'},{id:'a',latitude:23,longitude:71,heading:0,recorded_at:'2026-10-20T00:00:00Z'}];
afterEach(()=>{cleanup();vi.useRealTimers();});
it('steps through records, restarts and supports timeline scrubbing',()=>{
 render(<TrackingPlayback samples={samples}/>);
 expect(screen.getByText(/Sample 1 of 2/)).toBeTruthy();
 fireEvent.click(screen.getByText('Next sample'));expect(screen.getByText(/Sample 2 of 2/)).toBeTruthy();
 fireEvent.click(screen.getByText('Restart'));expect(screen.getByText(/Sample 1 of 2/)).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Recorded sample'),{target:{value:'1'}});expect(screen.getByText(/Sample 2 of 2/)).toBeTruthy();
});
it('plays at sample speed, stops at the end, and cleans up timers on unmount',()=>{
 vi.useFakeTimers();const view=render(<TrackingPlayback samples={samples}/>);
 fireEvent.click(screen.getByText('Play samples'));expect(screen.getByText('Pause playback')).toBeTruthy();
 act(()=>{vi.advanceTimersByTime(1000);});expect(screen.getByText(/Sample 2 of 2/)).toBeTruthy();expect(screen.getByText('Play samples')).toBeTruthy();
 fireEvent.click(screen.getByText('Play samples'));expect(screen.getByText(/Sample 1 of 2/)).toBeTruthy();
 view.unmount();expect(vi.getTimerCount()).toBe(0);
});
it('does not draw an invented connection across a recording gap',()=>{
 const {container}=render(<TrackingPlayback samples={[samples[1],{...samples[0],recorded_at:'2026-10-20T00:04:00Z'}]}/>);
 fireEvent.click(screen.getByText('Next sample'));
 expect(screen.getByText(/intervening path is unknown/)).toBeTruthy();
 expect(container.querySelectorAll('polyline')).toHaveLength(2);
});
it('handles missing or single samples without offering misleading playback',()=>{
 const view=render(<TrackingPlayback samples={[]}/>);expect(screen.getByText(/No valid coordinates/)).toBeTruthy();
 view.rerender(<TrackingPlayback samples={[samples[0]]}/>);expect(screen.getByText('Play samples').hasAttribute('disabled')).toBe(true);
});
it('pauses when the browser tab becomes hidden',()=>{
 vi.useFakeTimers();render(<TrackingPlayback samples={samples}/>);
 fireEvent.click(screen.getByText('Play samples'));
 const descriptor=Object.getOwnPropertyDescriptor(document,'hidden');
 Object.defineProperty(document,'hidden',{configurable:true,value:true});
 try{fireEvent(document,new Event('visibilitychange'));expect(screen.getByText('Play samples')).toBeTruthy();act(()=>vi.advanceTimersByTime(3000));expect(screen.getByText(/Sample 1 of 2/)).toBeTruthy();}
 finally{if(descriptor)Object.defineProperty(document,'hidden',descriptor);else Reflect.deleteProperty(document,'hidden');}
});
