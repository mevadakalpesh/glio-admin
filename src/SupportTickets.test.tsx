import {selectDateRange} from './test/select-date-range';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {SupportTickets} from './SupportTickets';
const mock=vi.hoisted(()=>({api:vi.fn(),permissions:['support.tickets.read','support.tickets.inspect']}));
vi.mock('./api',()=>({api:(path:string,options:unknown)=>path==='/support-tickets/alerts'?Promise.resolve({unacknowledged_overdue:0,generated_at:new Date().toISOString()}):mock.api(path,options)}));vi.mock('./useAuth',()=>({useAuth:()=>({session:{csrf_token:'csrf',staff:{permissions:mock.permissions}}})}));
const row={id:'id-1',status:'open',priority:'high',type:'payment',created_at:null,updated_at:null,resolved_at:null};
const result={items:[row],page:1,has_more:true,scope:'Assigned states'};
function mount(){render(<MemoryRouter><SupportTickets/></MemoryRouter>);}
afterEach(()=>{cleanup();mock.api.mockReset();mock.permissions=['support.tickets.read','support.tickets.inspect'];});
it('loads metadata and requests private content with reason and CSRF',async()=>{mock.api.mockResolvedValueOnce(result).mockResolvedValueOnce({subject:'Payment query',description:'<script>not executable</script>',resolution_notes:null,notes:'User-submitted content',truncated:false});mount();await screen.findByText('Inspect ticket content');fireEvent.click(screen.getByText('Inspect ticket content'));expect(mock.api).toHaveBeenCalledTimes(1);fireEvent.change(screen.getByLabelText('Ticket access reason'),{target:{value:'Investigate this payment'}});fireEvent.click(screen.getByText('View restricted content'));await screen.findByText('Payment query');expect(screen.getByText('<script>not executable</script>')).toBeTruthy();expect(mock.api.mock.calls[1][1]).toMatchObject({method:'POST',csrf:'csrf',body:{reason:'Investigate this payment'}});});
it('permission denied does not read and inspector is absent without permission',async()=>{mock.permissions=[];mount();expect(mock.api).not.toHaveBeenCalled();cleanup();mock.permissions=['support.tickets.read'];mock.api.mockResolvedValue(result);mount();await screen.findByText('Ticket entry 1 · payment');expect(screen.queryByText('Inspect ticket content')).toBeNull();});
it('filters and paging request server data',async()=>{mock.api.mockResolvedValue(result);mount();await screen.findByText('Ticket entry 1 · payment');fireEvent.click(screen.getByText('Next page'));await waitFor(()=>expect(mock.api).toHaveBeenLastCalledWith('/support-tickets?page=2',expect.anything()));fireEvent.change(screen.getByLabelText('status'),{target:{value:'resolved'}});fireEvent.click(screen.getByText('Apply ticket filters'));await waitFor(()=>expect(mock.api).toHaveBeenLastCalledWith('/support-tickets?status=resolved',expect.anything()));});
it('failed refresh clears the ticket list',async()=>{mock.api.mockResolvedValueOnce(result).mockRejectedValueOnce(Error('Inbox unavailable'));mount();await screen.findByText('Ticket entry 1 · payment');fireEvent.click(screen.getByText('Refresh tickets'));await screen.findByRole('alert');expect(screen.queryByText('Ticket entry 1 · payment')).toBeNull();});
it('closing pending inspection aborts and ignores its late response',async()=>{let resolve:(v:unknown)=>void=()=>{};mock.api.mockResolvedValueOnce(result).mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));mount();await screen.findByText('Inspect ticket content');fireEvent.click(screen.getByText('Inspect ticket content'));fireEvent.change(screen.getByLabelText('Ticket access reason'),{target:{value:'Investigate this ticket'}});fireEvent.click(screen.getByText('View restricted content'));const signal=mock.api.mock.calls[1][1].signal;fireEvent.click(screen.getByText('Close ticket content'));expect(signal.aborted).toBe(true);resolve({subject:'Late private data',description:'Secret',truncated:false,notes:''});await waitFor(()=>expect(screen.queryByText('Late private data')).toBeNull());});
it('filters customer follow-ups and shows response-needed indication',async()=>{mock.api.mockResolvedValue({...result,items:[{...row,customer_followup:true}]});mount();await screen.findByText('Customer follow-up · awaiting support response');fireEvent.change(screen.getByLabelText('followup'),{target:{value:'customer'}});fireEvent.click(screen.getByText('Apply ticket filters'));await waitFor(()=>expect(mock.api).toHaveBeenLastCalledWith('/support-tickets?followup=customer',expect.anything()));});
it('applies IST creation dates, resets page and clears filters',async()=>{
 mock.api.mockResolvedValue(result);mount();await screen.findByText('Ticket entry 1 · payment');
 fireEvent.click(screen.getByText('Next page'));await waitFor(()=>expect(mock.api).toHaveBeenLastCalledWith('/support-tickets?page=2',expect.anything()));
 selectDateRange('Ticket date range (IST)','2026-10-22');fireEvent.click(screen.getByText('Apply ticket filters'));
 await waitFor(()=>expect(mock.api).toHaveBeenLastCalledWith('/support-tickets?created_from=2026-10-22&created_to=2026-10-22',expect.anything()));
 expect(screen.getByRole('button',{name:'Ticket date range (IST)'}).textContent).toContain('22 Oct 2026');
 fireEvent.click(screen.getByText('Clear ticket filters'));await waitFor(()=>expect(mock.api).toHaveBeenLastCalledWith('/support-tickets?',expect.anything()));expect(screen.getByRole('button',{name:'Ticket date range (IST)'}).textContent).toBe('Ticket date range (IST)');
});
it('looks up a ticket reference without automatically exposing restricted content',async()=>{
 const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';mock.api.mockResolvedValue({...result,items:[{...row,id}]});mount();await screen.findByText('Ticket reference: '+id);
 fireEvent.change(screen.getByLabelText('Ticket reference'),{target:{value:id}});fireEvent.click(screen.getByText('Apply ticket filters'));
 await waitFor(()=>expect(mock.api).toHaveBeenLastCalledWith('/support-tickets?ticket_id='+id,expect.anything()));expect(screen.queryByText('View restricted content')).toBeNull();
 fireEvent.click(screen.getByText('Clear ticket filters'));await waitFor(()=>expect(screen.getByLabelText('Ticket reference')).toHaveProperty('value',''));
});
it('identifies customer-confirmed closure without offering staff response actions',async()=>{
 mock.api.mockResolvedValueOnce({...result,items:[{...row,status:'closed'}]}).mockResolvedValueOnce({subject:'Resolved query',description:'Customer message',status:'closed',version:3,can_respond:false,can_reopen:false,updates:[{id:'confirmation',action:'customer_close',body:'I confirmed that my support issue is resolved.',created_at:'2026-10-24T04:00:00Z'}]});
 mount();fireEvent.click(await screen.findByText('Inspect ticket content'));
 fireEvent.change(screen.getByLabelText('Ticket access reason'),{target:{value:'Review customer confirmation'}});fireEvent.click(screen.getByText('View restricted content'));
 await screen.findByText(/Customer · confirmed resolved/);expect(screen.getByText(/Closing a ticket does not settle a payment/)).toBeTruthy();expect(screen.queryByText('Send reply')).toBeNull();
});

it('filters first responses and clears obsolete overdue badges on refresh',async()=>{
 mock.api.mockResolvedValue({...result,items:[{...row,awaiting_first_response:true,first_response_overdue:true,first_response_due_at:'2026-10-24T04:00:00Z'}]});
 mount();await screen.findByText(/First response overdue/);
 fireEvent.change(screen.getByLabelText('First response'),{target:{value:'overdue'}});fireEvent.click(screen.getByText('Apply ticket filters'));
 await waitFor(()=>expect(mock.api).toHaveBeenLastCalledWith('/support-tickets?response=overdue',expect.anything()));
 mock.api.mockResolvedValue({...result,items:[]});fireEvent.click(screen.getByText('Refresh tickets'));
 await screen.findByText('No accessible tickets on this page.');expect(screen.queryByText(/First response overdue/)).toBeNull();
});
