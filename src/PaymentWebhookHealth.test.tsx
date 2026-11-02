import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {PaymentWebhookHealth} from './PaymentWebhookHealth';
import {useRead} from './useRead';
const access=vi.hoisted(()=>({permissions:['health.read','payments.read']}));
vi.mock('./useAuth',()=>({useAuth:()=>({session:{staff:{permissions:access.permissions}}})}));
vi.mock('./useRead',()=>({useRead:vi.fn()}));
afterEach(()=>{cleanup();vi.resetAllMocks();access.permissions=['health.read','payments.read']});
const mount=()=>render(<MemoryRouter><PaymentWebhookHealth/></MemoryRouter>);
it('blocks unauthorized fetch',()=>{access.permissions=[];mount();expect(useRead).not.toHaveBeenCalled();expect(screen.getByText(/do not have access/)).toBeTruthy()});
it('supports loading and manual refresh',()=>{vi.mocked(useRead).mockReturnValue(null);mount();expect(screen.getByRole('status')).toBeTruthy();fireEvent.click(screen.getByText('Refresh webhook evidence'));expect(useRead).toHaveBeenLastCalledWith('/payment-webhook-health',1)});
it('shows failures and no stale success state',()=>{vi.mocked(useRead).mockReturnValue({key:'webhook',error:'Unavailable'});mount();expect(screen.getByRole('alert').textContent).toBe('Unavailable');expect(screen.queryByRole('table')).toBeNull()});
it('separates configured environments and guards payment links',()=>{
 vi.mocked(useRead).mockReturnValue({key:'webhook',data:{generated_at:'2026-10-24T00:00:00Z',items:[{environment:'SANDBOX',outcomes:[{outcome:'signature_rejected',status:'recorded',count:3,first_at:null,last_at:null}]},{environment:'PRODUCTION',outcomes:[{outcome:'reconciliation_returned',status:'not_recorded',count:null,first_at:null,last_at:null}]}]}});const view=mount();expect(screen.getByText('Sandbox-configured endpoint')).toBeTruthy();expect(screen.getByText('Production-configured endpoint')).toBeTruthy();expect(screen.getByText(/does not prove payment success/)).toBeTruthy();expect(screen.getByText('Inspect test payment records').getAttribute('href')).toBe('/payments?environment=SANDBOX');access.permissions=['health.read'];view.rerender(<MemoryRouter><PaymentWebhookHealth/></MemoryRouter>);expect(screen.queryAllByRole('link')).toHaveLength(0);
});
