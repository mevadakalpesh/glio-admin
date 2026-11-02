import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {SupportEscalationPolicy} from './SupportEscalationPolicy';
const mock=vi.hoisted(()=>({api:vi.fn(),role:'owner'}));
vi.mock('./api',()=>({api:mock.api}));vi.mock('./useAuth',()=>({useAuth:()=>({session:{csrf_token:'csrf',staff:{role:mock.role}}})}));
const policy={enabled:false,delay_minutes:60,version:0,last_scan_at:null,last_scan_count:null};
afterEach(()=>{cleanup();mock.api.mockReset();mock.role='owner';});
it('requires owner and does not read for other staff',()=>{mock.role='support';render(<SupportEscalationPolicy/>);expect(screen.getByText(/Only an owner/)).toBeTruthy();expect(mock.api).not.toHaveBeenCalled();});
it('starts disabled and saves explicit enablement with reason/current version/CSRF',async()=>{
 mock.api.mockResolvedValue(policy);render(<SupportEscalationPolicy/>);
 expect((await screen.findByRole('switch',{name:'Enable automatic escalation'})).getAttribute('aria-checked')).toBe('false');
 expect(screen.getByText('Save escalation policy')).toHaveProperty('disabled',true);
 fireEvent.click(screen.getByRole('switch',{name:'Enable automatic escalation'}));fireEvent.change(screen.getByLabelText('Minutes after the follow-up deadline'),{target:{value:'30'}});fireEvent.change(screen.getByLabelText('Policy change reason'),{target:{value:'Enable overdue review queue'}});
 fireEvent.click(screen.getByText('Save escalation policy'));
 await waitFor(()=>expect(mock.api).toHaveBeenCalledWith('/support-escalation-policy',expect.objectContaining({method:'POST',csrf:'csrf',body:{enabled:true,delay_minutes:30,version:0,reason:'Enable overdue review queue'}})));
});
it('shows missing scan health and blocks uncertain retries until refresh',async()=>{
 mock.api.mockResolvedValueOnce({...policy,enabled:true,version:2}).mockRejectedValueOnce(Error('Policy changed'));render(<SupportEscalationPolicy/>);await screen.findByText(/No recent successful scan/);
 fireEvent.click(screen.getByRole('switch',{name:'Enable automatic escalation'}));fireEvent.change(screen.getByLabelText('Policy change reason'),{target:{value:'Pause the overdue review queue'}});fireEvent.click(screen.getByText('Save escalation policy'));
 await screen.findByRole('alert');expect(screen.getByText('Save escalation policy')).toHaveProperty('disabled',true);
 mock.api.mockResolvedValueOnce(policy);fireEvent.click(screen.getByText('Refresh escalation policy'));await screen.findByRole('switch',{name:'Enable automatic escalation'});expect(screen.queryByRole('alert')).toBeNull();
});
it('aborts hidden saves and validates minute bounds',async()=>{
 mock.api.mockResolvedValueOnce(policy).mockReturnValueOnce(new Promise(()=>{}));const view=render(<SupportEscalationPolicy/>);await screen.findByLabelText('Policy change reason');
 fireEvent.change(screen.getByLabelText('Policy change reason'),{target:{value:'Set internal followup timing'}});
 fireEvent.change(screen.getByLabelText('Minutes after the follow-up deadline'),{target:{value:'0'}});expect(screen.getByText('Save escalation policy')).toHaveProperty('disabled',true);
 fireEvent.change(screen.getByLabelText('Minutes after the follow-up deadline'),{target:{value:'30'}});fireEvent.click(screen.getByText('Save escalation policy'));const signal=mock.api.mock.calls[1][1].signal;view.unmount();expect(signal.aborted).toBe(true);
});
