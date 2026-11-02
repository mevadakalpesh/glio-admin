import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {SupportTicketAlerts} from './SupportTicketAlerts';
import {SupportTicketAcknowledge} from './SupportTicketAcknowledge';
const mock=vi.hoisted(()=>({api:vi.fn()}));
vi.mock('./api',()=>({api:mock.api}));vi.mock('./useAuth',()=>({useAuth:()=>({session:{csrf_token:'csrf',staff:{permissions:['support.tickets.schedule']}}})}));
afterEach(()=>{cleanup();mock.api.mockReset();});
it('shows scoped overdue count and links to the unacknowledged queue',async()=>{mock.api.mockResolvedValue({unacknowledged_overdue:2});render(<MemoryRouter><SupportTicketAlerts/></MemoryRouter>);await screen.findByText('2 overdue follow-up(s) need acknowledgement');expect(screen.getByRole('link').getAttribute('href')).toBe('/support/tickets?due=unacknowledged');});
it('focus refresh removes stale count when permission or network fails',async()=>{mock.api.mockResolvedValueOnce({unacknowledged_overdue:2}).mockRejectedValueOnce(Error('Access unavailable'));render(<MemoryRouter><SupportTicketAlerts/></MemoryRouter>);await screen.findByText('2 overdue follow-up(s) need acknowledgement');fireEvent.focus(window);await screen.findByRole('alert');expect(screen.queryByText('2 overdue follow-up(s) need acknowledgement')).toBeNull();});
it('acknowledges with reason/version/CSRF and refreshes only on success',async()=>{mock.api.mockRejectedValueOnce(Error('Ticket changed')).mockResolvedValueOnce({});const done=vi.fn();render(<SupportTicketAcknowledge id="ticket" version={2} onSaved={done}/>);fireEvent.change(screen.getByLabelText('Acknowledgement reason'),{target:{value:'Investigating this overdue ticket'}});fireEvent.click(screen.getByText('Acknowledge follow-up'));await screen.findByRole('alert');expect(done).not.toHaveBeenCalled();fireEvent.click(screen.getByText('Acknowledge follow-up'));await waitFor(()=>expect(done).toHaveBeenCalledOnce());expect(mock.api.mock.calls[0][1]).toMatchObject({csrf:'csrf',body:{version:2,reason:'Investigating this overdue ticket'}});});
it('links escalated follow-ups separately from all overdue work',async()=>{
 mock.api.mockResolvedValue({unacknowledged_overdue:3,escalated:1});
 render(<MemoryRouter><SupportTicketAlerts/></MemoryRouter>);
 const link=await screen.findByText('1 escalated follow-up(s) need review');expect(link.getAttribute('href')).toBe('/support/tickets?due=escalated');
});

it('links waiting tickets and breached first responses to separate queues',async()=>{
 mock.api.mockResolvedValue({unacknowledged_overdue:0,awaiting_first_response:4,first_response_overdue:2});
 render(<MemoryRouter><SupportTicketAlerts/></MemoryRouter>);
 expect((await screen.findByText('4 ticket(s) awaiting first staff response')).getAttribute('href')).toBe('/support/tickets?response=waiting');
 expect(screen.getByText('2 first response(s) overdue').getAttribute('href')).toBe('/support/tickets?response=overdue');
});
