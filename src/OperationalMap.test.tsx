import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {render,screen,cleanup,waitFor,fireEvent,act} from '@testing-library/react';
import {OperationalMap,type RouteSnapshot} from './OperationalMap';
const mock=vi.hoisted(()=>({load:vi.fn(),map:vi.fn(),path:vi.fn(),pan:vi.fn(),fit:vi.fn(),center:vi.fn(),listeners:{} as Record<string,()=>void>,heading:0}));
vi.mock('./trackingMapLoader',()=>({loadTrackingMap:mock.load}));
const pane=document.createElement('div');
const library={Map:class{constructor(){mock.map();}setZoom(){}fitBounds(){mock.fit();}panTo(p:unknown){mock.pan(p);}setCenter(p:unknown){mock.center(p);}getHeading(){return mock.heading;}addListener(name:string,fn:()=>void){mock.listeners[name]=fn;return {remove(){delete mock.listeners[name];}};}},Polyline:class{setPath(p:unknown){mock.path(p);}setMap(){}},LatLngBounds:class{extend(){}isEmpty(){return false;}},OverlayView:class{setMap(m:unknown){if(m)(this as unknown as {onAdd:()=>void}).onAdd();else (this as unknown as {onRemove:()=>void}).onRemove();}getPanes(){return {overlayMouseTarget:pane};}getProjection(){return {fromLatLngToDivPixel:()=>({x:50,y:60})};}}};
const route:RouteSnapshot={coordinates:[[71,23],[71.1,23]],total_km:10,remaining_km:5,remaining_minutes:30,progress_percent:50,estimate_basis:'Planned route'};
const position={id:'gps',latitude:23,longitude:71.05,heading:90,recorded_at:'2026-10-31T00:00:00Z'};
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('VITE_GOOGLE_MAPS_BROWSER_KEY','test');vi.stubGlobal('google',{maps:{LatLng:class{},LatLngBounds:library.LatLngBounds}});mock.load.mockResolvedValue(library);document.body.appendChild(pane);});
afterEach(()=>{cleanup();vi.useRealTimers();pane.replaceChildren();pane.remove();vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('draws stored route, distinct endpoint labels and rotated bike; retains viewport on refresh',async()=>{
 const view=render(<OperationalMap route={route} position={position} vehicle="Bike"/>);
 await waitFor(()=>expect(screen.getByAltText('Traveler vehicle')).toBeTruthy());
 expect(mock.path).toHaveBeenCalledWith([{lat:23,lng:71},{lat:23,lng:71.1}]);
 expect(screen.getByAltText('Trip start')).toBeTruthy();expect(screen.getByAltText('Trip destination')).toBeTruthy();
 expect(screen.getByAltText('Traveler vehicle').style.transform).toBe('rotate(90deg)');
 view.rerender(<OperationalMap route={route} position={{...position,heading:180}} vehicle="Bike"/>);
 expect(mock.map).toHaveBeenCalledTimes(1);expect(mock.fit).toHaveBeenCalledTimes(0);expect(screen.getByAltText('Traveler vehicle').style.transform).toBe('rotate(90deg)');
 fireEvent.click(screen.getByRole('button',{name:'Center traveler'}));expect(mock.center).toHaveBeenCalledWith({lat:23,lng:71.05});
 view.rerender(<OperationalMap route={route} vehicle="Bike"/>);
 expect(screen.getByLabelText('Traveler').style.display).toBe('none');expect(screen.getByRole('button',{name:'Center traveler'}).hasAttribute('disabled')).toBe(true);
});
it('does not call Google without configuration',()=>{vi.stubEnv('VITE_GOOGLE_MAPS_BROWSER_KEY','');render(<OperationalMap route={route}/>);expect(screen.getByRole('status').textContent).toContain('not configured');expect(mock.load).not.toHaveBeenCalled();});
it('shows provider failure without exposing raw response',async()=>{mock.load.mockRejectedValue(new Error('private'));render(<OperationalMap route={route}/>);await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('could not load'));expect(screen.queryByText('private')).toBeNull();});

it('uses mobile pickup/drop images and opens location details; removes departed stops',async()=>{
 const stops=[{id:'r:pickup',ride_id:'r',kind:'pickup' as const,latitude:23,longitude:71.03,label:'R0001 · Pickup',address:'Soladi',status:'BOOKED'},{id:'r:drop',ride_id:'r',kind:'drop' as const,latitude:23,longitude:71.06,label:'R0001 · Drop-off',address:'Chuli',status:'BOOKED'}];
 const view=render(<OperationalMap route={route} position={position} vehicle="Bike" stops={stops}/>);
 await waitFor(()=>expect(screen.getByAltText(/R0001 · Pickup/)).toBeTruthy());
 expect(screen.getByAltText(/R0001 · Pickup/).getAttribute('src')).toBe('/tracking/tracking-pickup.png');
 expect(screen.getByAltText(/R0001 · Drop-off/).getAttribute('src')).toBe('/tracking/tracking-drop.png');
 fireEvent.click(screen.getByRole('button',{name:/R0001 · Pickup/}));expect(screen.getByText(/R0001 · Pickup · Soladi/)).toBeTruthy();
 view.rerender(<OperationalMap route={route} position={position} vehicle="Bike" stops={[]}/>);
 expect(screen.queryByAltText(/R0001 · Pickup/)).toBeNull();expect(mock.map).toHaveBeenCalledTimes(1);
});

it('follows the bike, pauses on drag or route overview, and resumes without refitting',async()=>{
 const view=render(<OperationalMap route={route} position={position} vehicle="Bike"/>);
 await waitFor(()=>expect(screen.getByAltText('Traveler vehicle')).toBeTruthy());
 expect(mock.center).toHaveBeenCalledWith({lat:23,lng:71.05});
 fireEvent.click(screen.getByRole('button',{name:'Show entire route'}));
 expect(screen.getByRole('button',{name:'Center traveler'}).getAttribute('aria-pressed')).toBe('false');
 const count=mock.center.mock.calls.length;
 view.rerender(<OperationalMap route={route} position={{...position,latitude:24}} vehicle="Bike"/>);
 expect(mock.center).toHaveBeenCalledTimes(count);
 fireEvent.click(screen.getByRole('button',{name:'Center traveler'}));
 expect(mock.center).toHaveBeenLastCalledWith({lat:24,lng:71.05});
 expect(mock.fit).toHaveBeenCalledTimes(1);
 act(()=>mock.listeners.dragstart());
 expect(screen.getByRole('button',{name:'Center traveler'}).getAttribute('aria-pressed')).toBe('false');
});

it('automatically resumes following after dragging ends and cancels resume for route overview',async()=>{
 render(<OperationalMap route={route} position={position} vehicle="Bike"/>);
 await waitFor(()=>expect(screen.getByAltText('Traveler vehicle')).toBeTruthy());
 vi.useFakeTimers();
 act(()=>{mock.listeners.dragstart();mock.listeners.dragend();});
 expect(screen.getByRole('button',{name:'Center traveler'}).getAttribute('aria-pressed')).toBe('false');
 act(()=>vi.advanceTimersByTime(3000));
 expect(screen.getByRole('button',{name:'Center traveler'}).getAttribute('aria-pressed')).toBe('true');
 expect(mock.center).toHaveBeenLastCalledWith({lat:23,lng:71.05});
 expect(mock.fit).not.toHaveBeenCalled();
 act(()=>{mock.listeners.dragstart();mock.listeners.dragend();});
 fireEvent.click(screen.getByRole('button',{name:'Show entire route'}));
 act(()=>vi.advanceTimersByTime(3000));
 expect(screen.getByRole('button',{name:'Center traveler'}).getAttribute('aria-pressed')).toBe('false');
});
