import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {VerificationDecision} from './VerificationDecision';
import {api} from './api';
const access=vi.hoisted(()=>({allowed:true}));
vi.mock('./useAuth',()=>({useAuth:()=>({session:{csrf_token:'csrf',staff:{permissions:access.allowed?['verification.decide']:[]}}})}));
vi.mock('./api',()=>({api:vi.fn()}));
afterEach(()=>{cleanup();vi.resetAllMocks();access.allowed=true;});
const show=(onDone=vi.fn())=>render(<VerificationDecision kind="vehicles" id="trip" revision="revision" requiresExpiry onDone={onDone}/>);
it('hides decisions without permission',()=>{access.allowed=false;show();expect(screen.queryByRole('button')).toBeNull();expect(api).not.toHaveBeenCalled();});
it('records an explicit decision with reason, revision and idempotency identity',async()=>{
 const done=vi.fn();vi.mocked(api).mockResolvedValue({});show(done);await userEvent.type(screen.getByLabelText('Review reason'),'Please upload a clearer licence');await userEvent.click(screen.getByText('Record manual decision'));
 expect(api).toHaveBeenCalledWith('/verification/vehicles/trip/decision',expect.objectContaining({method:'POST',csrf:'csrf',body:expect.objectContaining({decision:'correction_requested',reason:'Please upload a clearer licence',revision:'revision',request_id:expect.any(String)})}));expect(done).toHaveBeenCalledOnce();
});
it('retries an uncertain response with the same identity and retains server guidance',async()=>{
 vi.mocked(api).mockRejectedValue(new Error('Open all evidence first'));show();await userEvent.type(screen.getByLabelText('Review reason'),'Please review documents');await userEvent.click(screen.getByText('Record manual decision'));expect(screen.getByRole('alert').textContent).toContain('Open all evidence');const first=vi.mocked(api).mock.calls[0][1]?.body;
 await userEvent.click(screen.getByText('Record manual decision'));expect(vi.mocked(api).mock.calls[1][1]?.body).toEqual(first);
});
