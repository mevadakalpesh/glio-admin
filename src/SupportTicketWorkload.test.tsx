import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {SupportTicketWorkload} from './SupportTicketWorkload';
const mock=vi.hoisted(()=>({api:vi.fn()}));
vi.mock('./api',()=>({api:mock.api}));
afterEach(()=>{cleanup();mock.api.mockReset();});
const result={counts:{total:2,open:1,in_progress:0,resolved:1,closed:0,unknown_status:0,urgent:1,customer_followup:1,unassigned:1,overdue:0,unacknowledged:0},scope:'Assigned regions',generated_at:'2026-10-22T00:00:00Z'};
function mount(){render(<MemoryRouter><SupportTicketWorkload/></MemoryRouter>);}
it('shows snapshot counts and exact queue filters without claiming SLA metrics',async()=>{mock.api.mockResolvedValue(result);mount();await screen.findByText('All tickets');expect(screen.getByRole('link',{name:/Overdue, not acknowledged/}).getAttribute('href')).toBe('/support/tickets?due=unacknowledged');expect(screen.getByRole('link',{name:/Urgent priority/}).getAttribute('href')).toBe('/support/tickets?priority=urgent');expect(screen.getByText(/not a response-time or SLA report/)).toBeTruthy();});
it('failed refresh removes previously shown metrics',async()=>{mock.api.mockResolvedValueOnce(result).mockRejectedValueOnce(Error('Workload read failed'));mount();await screen.findByText('All tickets');fireEvent.click(screen.getByText('Refresh workload'));await screen.findByRole('alert');expect(screen.queryByText('All tickets')).toBeNull();});
it('flags unknown statuses rather than silently treating them as open',async()=>{mock.api.mockResolvedValue({...result,counts:{...result.counts,unknown_status:1}});mount();await screen.findByText(/1 ticket\(s\) have an unrecognized status/);});
