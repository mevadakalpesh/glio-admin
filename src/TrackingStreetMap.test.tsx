import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {render,screen,cleanup,fireEvent,waitFor,act} from '@testing-library/react';
import {TrackingStreetMap} from './TrackingStreetMap';
import type {PlaybackPoint} from './trackingPlayback';
const mock=vi.hoisted(()=>({load:vi.fn(),map:vi.fn(),line:vi.fn(),center:vi.fn(),pan:vi.fn(),remove:vi.fn()}));
vi.mock('./trackingMapLoader',()=>({loadTrackingMap:mock.load}));
const points=[0,1,2,3].map((n)=>({id:String(n),latitude:23+n/1000,longitude:71,heading:0,recorded_at:'2026-10-20T00:00:00Z',timestamp:n*30000,x:n,y:n,gap:n===2})) as PlaybackPoint[];
const library={Map:class{constructor(){mock.map();}fitBounds(){}panTo(p:unknown){mock.pan(p);}},Polyline:class{constructor(p:unknown){mock.line(p);}setMap(p:unknown){mock.remove(p);}},Circle:class{setCenter(p:unknown){mock.center(p);}setMap(p:unknown){mock.remove(p);}},LatLngBounds:class{extend(){}}};
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('VITE_GOOGLE_MAPS_BROWSER_KEY','test-browser-key');mock.load.mockResolvedValue(library);});
afterEach(()=>{cleanup();vi.unstubAllEnvs();vi.useRealTimers();});
it('keeps coordinate fallback available without configuration',()=>{vi.stubEnv('VITE_GOOGLE_MAPS_BROWSER_KEY','');render(<TrackingStreetMap points={points} index={0}/>);expect(screen.getByText(/not configured/)).toBeTruthy();expect(mock.load).not.toHaveBeenCalled();});
it('initializes once, preserves gaps and only centers on explicit request',async()=>{
 const view=render(<TrackingStreetMap points={points} index={0}/>);
 await waitFor(()=>expect(mock.center).toHaveBeenCalled());
 expect(mock.line).toHaveBeenCalledTimes(2);
 expect(mock.line.mock.calls.map(call=>call[0].path.length)).toEqual([2,2]);
 view.rerender(<TrackingStreetMap points={points} index={3}/>);
 expect(mock.map).toHaveBeenCalledTimes(1);expect(mock.load).toHaveBeenCalledTimes(1);
 expect(mock.center).toHaveBeenLastCalledWith({lat:23.003,lng:71});expect(mock.pan).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Center selected sample'));expect(mock.pan).toHaveBeenCalledWith({lat:23.003,lng:71});
 view.unmount();expect(mock.remove).toHaveBeenCalledTimes(3);
});
it('shows a recoverable provider failure without leaking provider details',async()=>{mock.load.mockRejectedValue(new Error('secret provider text'));render(<TrackingStreetMap points={points} index={0}/>);expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('unavailable'));expect(screen.queryByText(/secret provider/)).toBeNull();});
it('handles authorization failure and disables center',async()=>{render(<TrackingStreetMap points={points} index={0}/>);await waitFor(()=>expect(mock.map).toHaveBeenCalled());act(()=>window.dispatchEvent(new Event('gilo-map-auth-failure')));expect(screen.getByRole('alert').textContent).toContain('authorized');expect(screen.getByText('Center selected sample').hasAttribute('disabled')).toBe(true);});
it('ignores a late load after close',async()=>{let resolve!:(value:typeof library)=>void;mock.load.mockReturnValue(new Promise(r=>{resolve=r;}));const view=render(<TrackingStreetMap points={points} index={0}/>);view.unmount();await act(async()=>resolve(library));expect(mock.map).not.toHaveBeenCalled();});
it('bounds loading time and ignores a provider response after timeout',async()=>{vi.useFakeTimers();let resolve!:(value:typeof library)=>void;mock.load.mockReturnValue(new Promise(r=>{resolve=r;}));render(<TrackingStreetMap points={points} index={0}/>);act(()=>vi.advanceTimersByTime(15000));expect(screen.getByRole('alert').textContent).toContain('too long');await act(async()=>resolve(library));expect(mock.map).not.toHaveBeenCalled();});

it('updates live coordinates without resetting the map viewport',async()=>{
 const view=render(<TrackingStreetMap points={[points[0]]} index={0} live/>);
 await waitFor(()=>expect(mock.center).toHaveBeenCalled());
 view.rerender(<TrackingStreetMap points={[points[3]]} index={0} live/>);
 expect(mock.map).toHaveBeenCalledTimes(1);
 expect(mock.center).toHaveBeenLastCalledWith({lat:23.003,lng:71});
 expect(mock.pan).not.toHaveBeenCalled();
});
