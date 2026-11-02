import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {NotificationHealth} from './NotificationHealth';
import {useRead} from './useRead';
const access=vi.hoisted(()=>({allowed:true}));
vi.mock('./useAuth',()=>({useAuth:()=>({session:{staff:{permissions:access.allowed?['notifications.delivery.read']:[]}}})}));
vi.mock('./useRead',()=>({useRead:vi.fn()}));
afterEach(()=>{cleanup();vi.resetAllMocks();access.allowed=true});
const mount=()=>render(<MemoryRouter><NotificationHealth/></MemoryRouter>);
it('does not fetch without permission',()=>{access.allowed=false;mount();expect(vi.mocked(useRead)).not.toHaveBeenCalled();expect(screen.getByText(/do not have access/)).toBeTruthy()});
it('supports period changes, refresh, loading and errors',()=>{vi.mocked(useRead).mockReturnValue(null);mount();expect(screen.getByRole('status')).toBeTruthy();fireEvent.change(screen.getByLabelText('Event creation period'),{target:{value:'7'}});expect(useRead).toHaveBeenLastCalledWith('/notification-health?days=7',0);fireEvent.click(screen.getByText('Refresh health'));expect(useRead).toHaveBeenLastCalledWith('/notification-health?days=7',1)});
it('shows empty evidence honestly and safe queue links',()=>{vi.mocked(useRead).mockReturnValue({key:'health',data:{since:'2026-10-23T00:00:00Z',generated_at:'2026-10-24T00:00:00Z',days:1,items:[]}});mount();expect(screen.getByText(/not a delivery-health confirmation/)).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Retry backlog actions'}));expect(screen.getByRole('menuitem',{name:'Inspect exhausted events'}).getAttribute('href')).toBe('/notifications?retry=exhausted')});
it('shows request error without stale evidence',()=>{vi.mocked(useRead).mockReturnValue({key:'health',error:'Unavailable'});mount();expect(screen.getByRole('alert').textContent).toBe('Unavailable');expect(screen.queryByText('Recent events')).toBeNull()});

it('keeps recent metrics separate from all-age backlog counts',()=>{vi.mocked(useRead).mockReturnValue({key:'health',data:{since:'2026-10-23T00:00:00Z',generated_at:'2026-10-24T00:00:00Z',days:1,items:[{channel:'support_update',recent_events:12,recent_failed:2,recent_skipped:1,provider_recorded:8,delivery_recorded:6,read_recorded:3,retryable:20,due:15,overdue:5,exhausted:4,oldest_due_at:null,last_sent_at:null}]}});mount();expect(screen.getByText('Recorded events').closest('article')?.textContent).toContain('12');expect(screen.getByText('Retries due').closest('article')?.textContent).toContain('15');expect(screen.getByText('All ages · eligible now')).toBeTruthy();expect(screen.getByRole('button',{name:'Columns'})).toBeTruthy();});
