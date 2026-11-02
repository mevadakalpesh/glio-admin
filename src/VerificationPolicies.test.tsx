import {chooseActivation} from './policyTestHelpers';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup,fireEvent,within} from '@testing-library/react';
import {VerificationPolicies} from './VerificationPolicies';
import {useRead} from './useRead';
import {api,ApiError} from './api';
const auth=vi.hoisted(()=>({id:'owner-a',permissions:['policies.read','policies.propose','policies.publish']}));
vi.mock('./useAuth',()=>({useAuth:()=>({session:{staff:auth,csrf_token:'csrf'}})}));
vi.mock('./useRead',()=>({useRead:vi.fn()}));vi.mock('./api',async importOriginal=>({...await importOriginal<typeof import('./api')>(),api:vi.fn()}));
afterEach(()=>{cleanup();vi.resetAllMocks();auth.id='owner-a';auth.permissions=['policies.read','policies.propose','policies.publish'];});
const values={identity_required:true,selfie_required:true,vehicle_required:true};
const snapshot=(items:unknown[]=[])=>({key:'verification',data:{current:{version:0,values},items,page:1,has_more:false}});
const item={id:'policy',version:1,state:'pending',actor_id:'owner-a',values,effective_at:'2027-01-01T06:00:00Z',reason:'Require manual verification',review_reason:null};
it('does not fetch without permission',()=>{auth.permissions=[];render(<VerificationPolicies/>);expect(useRead).not.toHaveBeenCalled();});
it('previews changed switches and submits the server preview with a reason',async()=>{
 vi.mocked(useRead).mockReturnValue(snapshot());
 const proposed={...values,identity_required:false};
 vi.mocked(api).mockResolvedValueOnce({preview_id:'preview',values:proposed,current:values,proposed,effective_at:'2027-01-01T06:00:00Z',expires_at:'2027-01-01T05:00:00Z'}).mockResolvedValueOnce({item});
 render(<VerificationPolicies/>);fireEvent.click(screen.getByRole('button',{name:'Change settings'}));
 fireEvent.click(screen.getByRole('switch',{name:'Identity document approval'}));fireEvent.change(screen.getByLabelText('When to apply'),{target:{value:'scheduled'}});await chooseActivation();fireEvent.click(screen.getByText('Preview settings'));
 await screen.findByLabelText('Reason');expect(api).toHaveBeenCalledWith('/verification-policies/preview',expect.objectContaining({body:{values:proposed,sample:{},effective_at:'2027-01-01T06:00:00.000Z'}}));
 fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Apply the agreed verification requirements'}});fireEvent.click(screen.getByText('Save settings'));
 await vi.waitFor(()=>expect(api).toHaveBeenLastCalledWith('/verification-policies',expect.objectContaining({body:expect.objectContaining({preview_id:'preview',operation_id:expect.any(String)})})));
});
it('lets the owner approve an existing pending proposal',async()=>{vi.mocked(useRead).mockReturnValue(snapshot([item]));render(<VerificationPolicies/>);fireEvent.click(screen.getByRole('button',{name:'Actions for version 1'}));fireEvent.click(await screen.findByRole('menuitem',{name:'View policy'}));expect(screen.getByText('Confirm decision')).toBeTruthy();expect(screen.getByRole('option',{name:'Withdraw proposal'})).toBeTruthy();});
it('published settings remain read-only',async()=>{vi.mocked(useRead).mockReturnValue(snapshot([{...item,state:'approved'}]));render(<VerificationPolicies/>);fireEvent.click(screen.getByRole('button',{name:'Actions for version 1'}));fireEvent.click(await screen.findByRole('menuitem',{name:'View policy'}));expect(within(screen.getByRole('dialog')).queryByLabelText('Reason')).toBeNull();});

it('defaults to immediate activation without requiring a date',async()=>{vi.mocked(useRead).mockReturnValue(snapshot());vi.mocked(api).mockResolvedValue({preview_id:'p',current:values,proposed:values,immediate:true,effective_at:'2027-01-01T00:00:00Z',expires_at:'2027-01-01T00:05:00Z'});render(<VerificationPolicies/>);fireEvent.click(screen.getByRole('button',{name:'Change settings'}));expect(screen.queryByText('Choose date')).toBeNull();fireEvent.click(screen.getByText('Preview settings'));await screen.findByLabelText('Reason');expect(api).toHaveBeenCalledWith('/verification-policies/preview',expect.objectContaining({body:{values,sample:{},effective_at:null}}));expect(screen.getByText('Activation: Immediately after saving')).toBeTruthy();});

it('shows field validation and does not send an empty reason',async()=>{vi.mocked(useRead).mockReturnValue(snapshot());vi.mocked(api).mockResolvedValue({preview_id:'p',current:values,proposed:values,immediate:true,effective_at:'2027-01-01T00:00:00Z',expires_at:'2027-01-01T00:05:00Z'});render(<VerificationPolicies/>);fireEvent.click(screen.getByRole('button',{name:'Change settings'}));fireEvent.click(screen.getByText('Preview settings'));await screen.findByLabelText('Reason');fireEvent.click(screen.getByText('Save settings'));expect(screen.getByLabelText('Reason').getAttribute('aria-invalid')).toBe('true');expect(api).toHaveBeenCalledTimes(1);});
it('unlocks editing after a definite rejection and explains the pending change',async()=>{vi.mocked(useRead).mockReturnValue(snapshot());vi.mocked(api).mockResolvedValueOnce({preview_id:'p',current:values,proposed:values,immediate:true,effective_at:'2027-01-01T00:00:00Z',expires_at:'2027-01-01T00:05:00Z'}).mockRejectedValueOnce(new ApiError('Review or withdraw the pending proposal first.',409));render(<VerificationPolicies/>);fireEvent.click(screen.getByRole('button',{name:'Change settings'}));fireEvent.click(screen.getByText('Preview settings'));await screen.findByLabelText('Reason');fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Update verification requirements'}});fireEvent.click(screen.getByText('Save settings'));await screen.findByRole('alert');expect(screen.getByRole('alert').textContent).toContain('Settings history');expect(screen.queryByText('Retry same save')).toBeNull();expect(screen.getByLabelText('Reason').hasAttribute('disabled')).toBe(false);expect(screen.getByText('Edit settings')).toBeTruthy();});
