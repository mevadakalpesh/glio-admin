import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {SystemHealth} from './SystemHealth';
import {useRead} from './useRead';
const access=vi.hoisted(()=>({permissions:['health.read','payments.read','notifications.delivery.read']}));
vi.mock('./useAuth',()=>({useAuth:()=>({session:{staff:{permissions:access.permissions}}})}));
vi.mock('./useRead',()=>({useRead:vi.fn()}));
afterEach(()=>{cleanup();vi.resetAllMocks();access.permissions=['health.read','payments.read','notifications.delivery.read'];});
const show=()=>render(<MemoryRouter><SystemHealth /></MemoryRouter>);
it('denies fetching without permission',()=>{access.permissions=[];show();expect(useRead).not.toHaveBeenCalled();expect(screen.getByText(/do not have access/)).toBeTruthy();});
it('separates unavailable counts from zero and makes monitoring gaps explicit',async()=>{
 vi.mocked(useRead).mockReturnValue({key:'health',data:{generated_at:'2026-10-19T00:00:00Z',signals:[{id:'notifications_failed',status:'recorded',count:0},{id:'PRODUCTION_payment_errors',status:'unavailable',count:null}]}});
 show();expect(screen.getByText('0')).toBeTruthy();expect(screen.getAllByText('Unavailable').length).toBe(5);expect(screen.getByText(/Zero recorded issues/)).toBeTruthy();
 expect(screen.getByText('View all failed events').getAttribute('href')).toBe('/notifications?status=failed');
 await userEvent.click(screen.getByText('Refresh health'));expect(useRead).toHaveBeenLastCalledWith('/health',1);
});
it('shows load/error states and does not expose links without their permission',()=>{
 vi.mocked(useRead).mockReturnValue(null);const view=show();expect(screen.getByRole('status')).toBeTruthy();
 vi.mocked(useRead).mockReturnValue({key:'health',error:'Unavailable'});view.rerender(<MemoryRouter><SystemHealth/></MemoryRouter>);expect(screen.getByRole('alert').textContent).toBe('Unavailable');
 access.permissions=['health.read'];vi.mocked(useRead).mockReturnValue({key:'health',data:{generated_at:'bad',signals:[]}});view.rerender(<MemoryRouter><SystemHealth/></MemoryRouter>);expect(screen.queryAllByRole('link')).toHaveLength(1);expect(screen.getByRole('link').getAttribute('href')).toBe('/map-health');
});
it('shows stale and failed execution evidence without presenting a return as business success',()=>{
 vi.mocked(useRead).mockReturnValue({key:'health',data:{generated_at:'2026-10-24T06:00:00Z',signals:[],automations:[
  {id:'a',label:'Matching scan',status:'stale',interval_seconds:60,stale_after_seconds:180,started_at:'2026-10-24T05:00:00Z',finished_at:null},
  {id:'b',label:'Settlement scan',status:'returned',interval_seconds:60,stale_after_seconds:180,started_at:'2026-10-24T05:59:00Z',finished_at:'2026-10-24T05:59:01Z'},
  {id:'c',label:'Retry scan',status:'threw',interval_seconds:60,stale_after_seconds:180,started_at:'2026-10-24T05:59:00Z',finished_at:'2026-10-24T05:59:01Z'},
 ]}});
 show();expect(screen.getByText('Activity overdue')).toBeTruthy();expect(screen.getByText('Execution returned')).toBeTruthy();expect(screen.getByText('Execution failed')).toBeTruthy();expect(screen.getByText(/does not confirm payment settlement/)).toBeTruthy();expect(screen.getByText(/cannot restart or retry/)).toBeTruthy();
});
