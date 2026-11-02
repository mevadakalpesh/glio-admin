import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RemainderPreview} from './RemainderPreview';
import {api} from './api';
vi.mock('./useAuth',()=>({useAuth:()=>({session:{csrf_token:'csrf',staff:{permissions:['cases.wallet-refund.preview','cases.wallet-refund.propose']}}})}));
vi.mock('./api',()=>({api:vi.fn()}));
afterEach(()=>{cleanup();vi.resetAllMocks();});
const response={allocation:{outcome:'settle_traveler',remaining_held_paise:6999,rider_refund_paise:0,traveler_payout_paise:5949,platform_fee_paise:1050},preview_token:'token',expires_at:new Date(Date.now()+300000).toISOString(),reason:'Reviewed the remaining balance'};
it('previews chosen allocation and submits a separate proposal only after confirmation',async()=>{
 const saved=vi.fn();vi.mocked(api).mockResolvedValueOnce(response).mockResolvedValueOnce({});
 render(<RemainderPreview id="case" onProposed={saved}/>);
 await userEvent.selectOptions(screen.getByLabelText('Remainder outcome'),'settle_traveler');
 await userEvent.type(screen.getByLabelText('Decision rationale'),response.reason);
 await userEvent.click(screen.getByText('Preview remaining-balance decision'));
 await screen.findByText('₹59.49');expect(api).toHaveBeenCalledTimes(1);
 await userEvent.click(screen.getByText('Review remainder proposal'));
 expect(api).toHaveBeenCalledTimes(1);
 await userEvent.click(screen.getByText('Submit remainder proposal'));
 await waitFor(()=>expect(saved).toHaveBeenCalledOnce());
 expect(api).toHaveBeenLastCalledWith('/ride-cases/case/remainder-proposals',expect.objectContaining({body:expect.objectContaining({preview_token:'token'})}));
});
it('does not offer submission after a failed preview',async()=>{
 vi.mocked(api).mockRejectedValue(Error('Financial evidence changed'));
 render(<RemainderPreview id="case" onProposed={()=>{}}/>);
 await userEvent.type(screen.getByLabelText('Decision rationale'),response.reason);
 await userEvent.click(screen.getByText('Preview remaining-balance decision'));
 await screen.findByText('Financial evidence changed');expect(screen.queryByText('Review remainder proposal')).toBeNull();
});
