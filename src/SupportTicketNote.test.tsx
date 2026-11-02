import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {SupportTicketNote} from './SupportTicketNote';
const mock=vi.hoisted(()=>({api:vi.fn(),permissions:['support.tickets.notes']}));
vi.mock('./api',()=>({api:mock.api}));vi.mock('./useAuth',()=>({useAuth:()=>({session:{csrf_token:'csrf',staff:{permissions:mock.permissions}}})}));
afterEach(()=>{cleanup();mock.api.mockReset();mock.permissions=['support.tickets.notes'];});

function fill(){fireEvent.change(screen.getByLabelText('Internal note'),{target:{value:'Internal investigation for shift handover.'}});}
it('saves a private note with version and CSRF without a customer action',async()=>{mock.api.mockResolvedValue({});const done=vi.fn();render(<SupportTicketNote id="ticket" version={2} onSaved={done}/>);fill();fireEvent.click(screen.getByText('Save internal note'));await waitFor(()=>expect(done).toHaveBeenCalledOnce());expect(mock.api.mock.calls[0][0]).toBe('/support-tickets/ticket/notes');expect(mock.api.mock.calls[0][1]).toMatchObject({csrf:'csrf',body:{version:2,message:'Internal investigation for shift handover.'}});expect(mock.api.mock.calls[0][1].body.action).toBeUndefined();});
it('retains note and operation identity after an uncertain network outcome',async()=>{mock.api.mockRejectedValueOnce(Error('Network unavailable')).mockResolvedValueOnce({});const done=vi.fn();render(<SupportTicketNote id="ticket" version={2} onSaved={done}/>);fill();fireEvent.click(screen.getByText('Save internal note'));await screen.findByRole('alert');expect(done).not.toHaveBeenCalled();fireEvent.click(screen.getByText('Save internal note'));await waitFor(()=>expect(done).toHaveBeenCalledOnce());expect(mock.api.mock.calls[0][1].body.operation_id).toBe(mock.api.mock.calls[1][1].body.operation_id);});
it('hides note writes without permission',()=>{mock.permissions=[];render(<SupportTicketNote id="ticket" version={2} onSaved={()=>{}}/>);expect(screen.queryByText('Save internal note')).toBeNull();});
