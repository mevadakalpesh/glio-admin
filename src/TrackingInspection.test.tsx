import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup,waitFor,fireEvent,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {TrackingInspection} from './TrackingInspection';
import {api} from './api';
const access=vi.hoisted(()=>({allowed:true}));
vi.mock('./useAuth',()=>({useAuth:()=>({session:{csrf_token:'csrf',staff:{permissions:access.allowed?['tracking.evidence.read']:[]}}})}));
vi.mock('./api',()=>({api:vi.fn()}));
afterEach(()=>{cleanup();vi.resetAllMocks();access.allowed=true;});
const data={trip:{reference:'T0013',status:'STARTED'},gps:{state:'stale',recorded_at:null},heartbeat:{state:'recent',recorded_at:null},items:[{id:'sample',latitude:0,longitude:0,heading:0,recorded_at:'2026-10-20T10:00:00.000Z'}],page:1,page_size:25,total:26,from:'2026-10-20T09:30:00.000Z',to:'2026-10-20T10:00:00.000Z',generated_at:'2026-10-20T10:00:00.000Z'};
async function chooseTime(label:string,hour:string,minute:string){
 const group=within(screen.getByRole('group',{name:`${label} date and time (IST)`}));
 fireEvent.click(group.getByLabelText(`${label} date`));
 fireEvent.change(await screen.findByRole('combobox',{name:'Choose the Year'}),{target:{value:'2026'}});
 fireEvent.change(screen.getByRole('combobox',{name:'Choose the Month'}),{target:{value:'9'}});
 fireEvent.click(screen.getByRole('button',{name:/Saturday, October 10th, 2026/}));
 fireEvent.change(group.getByLabelText('Hour'),{target:{value:hour}});
 fireEvent.change(group.getByLabelText('Minute'),{target:{value:minute}});
}
async function inspect(){await userEvent.click(screen.getByText('Inspect recorded locations'));}
it('does not read or render precise evidence without permission',()=>{access.allowed=false;render(<TrackingInspection id="trip" onClose={()=>{}}/>);expect(screen.queryByLabelText('Inspection reason')).toBeNull();expect(api).not.toHaveBeenCalled();});
it('uses audited server-time windows and preserves bounds when paging',async()=>{
 vi.mocked(api).mockResolvedValueOnce(data).mockResolvedValueOnce({...data,page:2,items:[]});
 render(<TrackingInspection id="trip" onClose={()=>{}}/>);expect(api).not.toHaveBeenCalled();
 expect(screen.getByText('Inspect recorded locations').hasAttribute('disabled')).toBe(false);
 await inspect();await screen.findByText('0°');expect(screen.getByText('stale')).toBeTruthy();
 expect(api).toHaveBeenNthCalledWith(1,'/tracking/trip/inspection',expect.objectContaining({method:'POST',csrf:'csrf',body:{page:1,window_minutes:30}}));
 await userEvent.click(screen.getByText('Next samples'));
 await screen.findByText('No location samples were recorded in this window.');
 expect(api).toHaveBeenNthCalledWith(2,'/tracking/trip/inspection',expect.objectContaining({body:{page:2,from:data.from,to:data.to}}));
});
it('failed inspection shows unavailable rather than empty or stale coordinates',async()=>{
 vi.mocked(api).mockResolvedValueOnce(data).mockRejectedValueOnce(new Error('Access changed.'));
 render(<TrackingInspection id="trip" onClose={()=>{}}/>);await inspect();await screen.findByText('0°');
 await userEvent.click(screen.getByText('Inspect recorded locations'));
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','Access changed.');
 expect(screen.queryByText('0°')).toBeNull();expect(screen.queryByText('No location samples were recorded in this window.')).toBeNull();
});
it('closing cancels a pending request and ignores its late response',async()=>{
 let resolve!:(value:unknown)=>void;vi.mocked(api).mockImplementation(()=>new Promise(r=>{resolve=r;}) as ReturnType<typeof api>);
 const mounted=render(<TrackingInspection id="trip" onClose={()=>{}}/>);await inspect();
 const options=vi.mocked(api).mock.calls[0][1];mounted.unmount();expect(options?.signal?.aborted).toBe(true);
 resolve(data);await waitFor(()=>expect(screen.queryByText('T0013')).toBeNull());
});
it('loads the complete selected window with fixed bounds and hides page navigation',async()=>{
 vi.mocked(api).mockResolvedValueOnce(data).mockResolvedValueOnce({...data,mode:'window',page_size:1000,total:1});
 render(<TrackingInspection id="trip" onClose={()=>{}}/>);await inspect();await screen.findByText('0°');
 await userEvent.click(screen.getByText('Load full window for playback'));
 await screen.findByText('Return to paged inspection');
 expect(api).toHaveBeenNthCalledWith(2,'/tracking/trip/inspection',expect.objectContaining({body:{page:1,from:data.from,to:data.to,mode:'window'}}));
 expect(screen.queryByText('Next samples')).toBeNull();expect(screen.getByText(/complete time window/)).toBeTruthy();
});
it('an oversized window never displays a partial playback as complete',async()=>{
 vi.mocked(api).mockResolvedValueOnce(data).mockRejectedValueOnce(new Error('Choose a shorter history window.'));
 render(<TrackingInspection id="trip" onClose={()=>{}}/>);await inspect();await screen.findByText('0°');
 await userEvent.click(screen.getByText('Load full window for playback'));
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','Choose a shorter history window.');
 expect(screen.queryByLabelText('Recorded location playback')).toBeNull();
 expect(screen.getByRole('option',{name:'Last 5 minutes'})).toBeTruthy();
});
it('opens historical selection without fetching and submits India time as UTC',async()=>{
 vi.mocked(api).mockResolvedValue(data);
 render(<TrackingInspection id="trip" historical onClose={()=>{}}/>);
 expect(api).not.toHaveBeenCalled();
 await chooseTime('From','17','30');
 await chooseTime('To','18','30');
 await inspect();await screen.findByText('0°');
 expect(api).toHaveBeenCalledWith('/tracking/trip/inspection',expect.objectContaining({body:{page:1,from:'2026-10-10T12:00:00.000Z',to:'2026-10-10T13:00:00.000Z'}}));
});
it('does not request an oversized historical window',async()=>{
 render(<TrackingInspection id="trip" historical onClose={()=>{}}/>);
 await chooseTime('From','12','00');
 await chooseTime('To','19','00');
 await inspect();expect(await screen.findByRole('alert')).toHaveProperty('textContent','Choose valid start and end times in IST, up to six hours apart.');
 expect(api).not.toHaveBeenCalled();
});
