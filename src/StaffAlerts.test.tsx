import {afterEach,it,expect,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {StaffAlerts} from './StaffAlerts';
const mock=vi.hoisted(()=>({api:vi.fn(),allowed:true,id:'one'}));
vi.mock('./api',()=>({api:mock.api}));
vi.mock('./useAuth',()=>({useAuth:()=>({session:{csrf_token:'csrf',staff:{id:mock.id,role:'support',assigned_states:['GJ'],permissions:mock.allowed?['support.tickets.read']:[]}}})}));
const snapshot={escalated:2,unacknowledged_overdue:3,first_response_overdue:1,awaiting_first_response:4,generated_at:'2026-10-24T06:00:00Z'};
function mount(){return render(<MemoryRouter><StaffAlerts/></MemoryRouter>);}
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();mock.api.mockReset();mock.allowed=true;mock.id='one';});
it('does not request or render alerts without support access',()=>{mock.allowed=false;mount();expect(screen.queryByRole('button')).toBeNull();expect(mock.api).not.toHaveBeenCalled();});
it('counts queues rather than adding overlapping ticket counts and links to exact filters',async()=>{
 mock.api.mockResolvedValue(snapshot);mount();await screen.findByRole('button',{name:'Staff alerts: 4 queues need review'});
 fireEvent.click(screen.getByRole('button',{name:/Staff alerts:/}));
 const link=await screen.findByRole('link',{name:'Escalated follow-ups 2'});expect(link.getAttribute('href')).toBe('/support/tickets?due=escalated');
 expect(screen.getByRole('link',{name:'First responses overdue 1'}).getAttribute('href')).toBe('/support/tickets?response=overdue');
 expect(screen.getByRole('link',{name:'Waiting for first response 4'}).getAttribute('href')).toBe('/support/tickets?response=waiting');
 expect(screen.getByText(/a ticket can appear/)).toBeTruthy();fireEvent.click(link);expect(screen.queryByRole('region')).toBeNull();
});
it('clears failed counts and recovers through explicit refresh',async()=>{
 mock.api.mockResolvedValue(snapshot);mount();await screen.findByRole('button',{name:'Staff alerts: 4 queues need review'});
 mock.api.mockRejectedValueOnce(Error('forbidden private detail'));fireEvent.click(screen.getByRole('button',{name:/Staff alerts:/}));
 await screen.findByRole('alert');expect(screen.queryByRole('link')).toBeNull();expect(screen.queryByText(/forbidden private detail/)).toBeNull();
 fireEvent.click(screen.getByText('Refresh alerts'));await screen.findByRole('link',{name:'Escalated follow-ups 2'});
});
it('fails closed on invalid counts and displays a genuine empty snapshot',async()=>{
 mock.api.mockResolvedValue({...snapshot,escalated:-1});mount();fireEvent.click(screen.getByRole('button',{name:/Staff alerts:/}));await screen.findByRole('alert');
 mock.api.mockResolvedValue({...snapshot,escalated:0,unacknowledged_overdue:0,first_response_overdue:0,awaiting_first_response:0});fireEvent.click(screen.getByText('Refresh alerts'));
 await screen.findByText('No support tickets need review in these queues.');expect(screen.queryByRole('link')).toBeNull();
});
it('closes on Escape and outside click, returning focus on Escape',async()=>{
 mock.api.mockResolvedValue(snapshot);mount();const trigger=screen.getByRole('button',{name:/Staff alerts:/});fireEvent.click(trigger);await screen.findByRole('region');
 fireEvent.keyDown(document,{key:'Escape'});expect(screen.queryByRole('region')).toBeNull();expect(document.activeElement).toBe(trigger);
 fireEvent.click(trigger);await screen.findByRole('region');fireEvent.pointerDown(document.body);expect(screen.queryByRole('region')).toBeNull();
});
it('aborts old requests and ignores results after account or permission changes',async()=>{
 let resolve:(v:unknown)=>void=()=>{};mock.api.mockImplementationOnce(()=>new Promise(r=>{resolve=r;})).mockResolvedValue(snapshot);
 const view=mount();const signal=mock.api.mock.calls[0][1].signal;mock.id='two';view.rerender(<MemoryRouter><StaffAlerts/></MemoryRouter>);expect(signal.aborted).toBe(true);
 await screen.findByRole('button',{name:'Staff alerts: 4 queues need review'});await act(async()=>resolve({...snapshot,escalated:0}));
 expect(screen.getByRole('button',{name:'Staff alerts: 4 queues need review'})).toBeTruthy();
 mock.allowed=false;view.rerender(<MemoryRouter><StaffAlerts/></MemoryRouter>);expect(screen.queryByRole('button')).toBeNull();
});
it('pauses hidden/offline checks, resumes on visibility or connection, and never overlaps requests',async()=>{
 let visible='visible',online=true;vi.spyOn(document,'visibilityState','get').mockImplementation(()=>visible as DocumentVisibilityState);vi.spyOn(navigator,'onLine','get').mockImplementation(()=>online);
 mock.api.mockReturnValueOnce(new Promise(()=>{})).mockResolvedValue(snapshot);mount();const signal=mock.api.mock.calls[0][1].signal;
 fireEvent.focus(window);expect(mock.api).toHaveBeenCalledTimes(1);
 visible='hidden';fireEvent(document,new Event('visibilitychange'));expect(signal.aborted).toBe(true);fireEvent.focus(window);expect(mock.api).toHaveBeenCalledTimes(1);
 visible='visible';online=false;fireEvent(window,new Event('offline'));fireEvent(document,new Event('visibilitychange'));expect(mock.api).toHaveBeenCalledTimes(1);
 online=true;fireEvent(window,new Event('online'));await screen.findByRole('button',{name:'Staff alerts: 4 queues need review'});expect(mock.api).toHaveBeenCalledTimes(2);
});
it('refreshes every minute and stops timers and pending requests on unmount',async()=>{
 vi.useFakeTimers();mock.api.mockResolvedValue(snapshot);const view=mount();await act(async()=>{});expect(mock.api).toHaveBeenCalledTimes(1);
 await act(async()=>{vi.advanceTimersByTime(60000);});expect(mock.api).toHaveBeenCalledTimes(2);
 mock.api.mockReturnValueOnce(new Promise(()=>{}));fireEvent.focus(window);const signal=mock.api.mock.calls[2][1].signal;view.unmount();expect(signal.aborted).toBe(true);
 await act(async()=>{vi.advanceTimersByTime(60000);});expect(mock.api).toHaveBeenCalledTimes(3);
});
it('timeouts clear busy state and permit a retry without accepting late data',async()=>{
 vi.useFakeTimers();mock.api.mockReturnValueOnce(new Promise(()=>{})).mockResolvedValue(snapshot);mount();fireEvent.click(screen.getByRole('button',{name:/Staff alerts:/}));
 await act(async()=>{vi.advanceTimersByTime(15000);});expect(screen.getByRole('alert').textContent).toMatch(/timed out/);expect(mock.api.mock.calls[0][1].signal.aborted).toBe(true);
 fireEvent.click(screen.getByText('Refresh alerts'));await act(async()=>{});expect(screen.getByRole('link',{name:'Escalated follow-ups 2'})).toBeTruthy();
});

it('a successful support action aborts an older snapshot and fetches updated counts',async()=>{
 let resolve:(v:unknown)=>void=()=>{};mock.api.mockImplementationOnce(()=>new Promise(r=>{resolve=r;})).mockResolvedValue({...snapshot,escalated:0});
 mount();const oldSignal=mock.api.mock.calls[0][1].signal;fireEvent(window,new Event('gilo-support-alerts-changed'));
 expect(oldSignal.aborted).toBe(true);await screen.findByRole('button',{name:'Staff alerts: 3 queues need review'});
 await act(async()=>resolve(snapshot));expect(screen.queryByRole('button',{name:'Staff alerts: 4 queues need review'})).toBeNull();
});
