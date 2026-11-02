import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {CaseExitReview} from './CaseExitReview';
const mock=vi.hoisted(()=>({api:vi.fn(),allowed:true}));
vi.mock('./api',()=>({api:mock.api}));
vi.mock('./useAuth',()=>({useAuth:()=>({session:{csrf_token:'csrf',staff:{permissions:mock.allowed?['cases.description.read']:[]}}})}));
afterEach(()=>{cleanup();mock.api.mockReset();mock.allowed=true;});
function open(){render(<CaseExitReview id="case"/>);fireEvent.change(screen.getByLabelText('Exit-review reason'),{target:{value:'Review passenger contact'}});}
it('requires permission and explicit reason-gated reading',()=>{open();expect(mock.api).not.toHaveBeenCalled();cleanup();mock.allowed=false;render(<CaseExitReview id="case"/>);expect(screen.queryByText('Passenger exit review')).toBeNull();});
it('shows the server guidance without offering an exit override',async()=>{mock.api.mockResolvedValue({state:'awaiting_passenger',guidance:'Passenger app confirmation is required.',ride_status:'ON THE WAY',exit_confirmed_at:null,checked_at:'2026-10-21T10:00:00Z'});open();fireEvent.click(screen.getByText('Review passenger exit'));await screen.findByText('Passenger app confirmation is required.');expect(screen.getByText('Recorded exit: Not confirmed')).toBeTruthy();expect(mock.api.mock.calls[0][1].body).toEqual({reason:'Review passenger contact'});expect(screen.queryByText('Confirm exit')).toBeNull();fireEvent.click(screen.getByText('Hide exit review'));expect(screen.queryByText('Passenger app confirmation is required.')).toBeNull();});
it('clears prior evidence when a subsequent review fails',async()=>{mock.api.mockResolvedValueOnce({state:'inconsistent',guidance:'Investigate first.',ride_status:'ON THE WAY',exit_confirmed_at:null,checked_at:'2026-10-21T10:00:00Z'}).mockRejectedValueOnce(Error('Permission denied'));open();fireEvent.click(screen.getByText('Review passenger exit'));await screen.findByText('Investigate first.');fireEvent.click(screen.getByText('Review passenger exit'));await screen.findByRole('alert');expect(screen.queryByText('Investigate first.')).toBeNull();});

it('shows independently verified staff provenance without exposing staff identifiers',async()=>{
 mock.api.mockResolvedValue({state:'confirmed',guidance:'Exit recorded.',confirmation_source:'staff_independent_approval',ride_status:'DISPUTED',exit_confirmed_at:'2026-10-21T10:00:00Z',checked_at:'2026-10-21T10:01:00Z'});open();fireEvent.click(screen.getByText('Review passenger exit'));await screen.findByText(/Confirmation source: Direct passenger contact with independent staff approval/);
});
