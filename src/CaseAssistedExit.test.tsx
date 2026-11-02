import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {CaseAssistedExit} from './CaseAssistedExit';
const mock=vi.hoisted(()=>({api:vi.fn(),allowed:true}));
vi.mock('./api',()=>({api:mock.api}));
vi.mock('./useAuth',()=>({useAuth:()=>({session:{csrf_token:'csrf',staff:{permissions:mock.allowed?['cases.exit.manage']:[]}}})}));
afterEach(()=>{cleanup();mock.api.mockReset();mock.allowed=true;});
function open(){render(<CaseAssistedExit id="case"/>);fireEvent.change(screen.getByLabelText('Assisted-exit reason and evidence'),{target:{value:'Independently reviewed passenger confirmation'}});}
const proposal={id:'proposal',by_you:false,method:'phone',confirmed_at:'2026-10-21T10:00:00Z',note:'Spoke directly with passenger',status:'pending',stale:false};
it('does not read automatically or render for unauthorized staff',()=>{open();expect(mock.api).not.toHaveBeenCalled();cleanup();mock.allowed=false;render(<CaseAssistedExit id="case"/>);expect(screen.queryByText('Assisted passenger exit')).toBeNull();});
it('does not allow approving own or stale proposal',async()=>{mock.api.mockResolvedValue({items:[{...proposal,by_you:true}]});open();fireEvent.click(screen.getByText('Review exit proposals'));await screen.findByText(/Your proposal/);expect(screen.queryByText('Approve assisted exit')).toBeNull();mock.api.mockResolvedValue({items:[{...proposal,stale:true}]});fireEvent.click(screen.getByText('Review exit proposals'));await screen.findByText(/needs new confirmation/);expect(screen.getByText('Approve assisted exit').hasAttribute('disabled')).toBe(true);});
it('submits an independent decision and reports that finances remain unchanged',async()=>{mock.api.mockResolvedValueOnce({items:[proposal]}).mockResolvedValueOnce({outcome:'approved'});open();fireEvent.click(screen.getByText('Review exit proposals'));await screen.findByText('Spoke directly with passenger');fireEvent.click(screen.getByText('Approve assisted exit'));await screen.findByText(/no money was moved/);expect(mock.api.mock.calls[1][1].body).toMatchObject({action:'approve',proposal_id:'proposal'});});
it('requires direct attestation and converts contact time from IST',async()=>{mock.api.mockResolvedValue({});open();fireEvent.change(screen.getByLabelText('Confirmation time (IST)'),{target:{value:'2026-10-21T15:30'}});expect(screen.getByText('Submit exit proposal').hasAttribute('disabled')).toBe(true);fireEvent.click(screen.getByLabelText(/I directly confirmed/));fireEvent.click(screen.getByText('Submit exit proposal'));await screen.findByText(/Proposal recorded/);expect(mock.api.mock.calls[0][1].body).toMatchObject({action:'propose',confirmed_at:'2026-10-21T10:00:00.000Z',attested:true,method:'phone'});});
it('lets the proposer withdraw and clearly reports that the ride is unchanged',async()=>{
 mock.api.mockResolvedValueOnce({items:[{...proposal,by_you:true}]}).mockResolvedValueOnce({outcome:'withdrawn'});
 open();fireEvent.click(screen.getByText('Review exit proposals'));await screen.findByText('Withdraw proposal');
 expect(screen.queryByText('Approve assisted exit')).toBeNull();fireEvent.click(screen.getByText('Withdraw proposal'));
 await screen.findByText('Proposal withdrawn. Ride unchanged.');expect(mock.api.mock.calls[1][1].body).toMatchObject({action:'withdraw',proposal_id:'proposal'});
});
it('never offers withdrawal for another staff member or an approved proposal',async()=>{
 mock.api.mockResolvedValueOnce({items:[proposal]}).mockResolvedValueOnce({items:[{...proposal,by_you:true,status:'approved'}]});
 open();fireEvent.click(screen.getByText('Review exit proposals'));await screen.findByText('Spoke directly with passenger');expect(screen.queryByText('Withdraw proposal')).toBeNull();
 fireEvent.click(screen.getByText('Review exit proposals'));await screen.findByText(/Your proposal/);expect(screen.queryByText('Withdraw proposal')).toBeNull();
});
it('pages older evidence and displays the recorded decision reason',async()=>{
 const next={id:'older-id',at:'2026-10-21T09:00:00Z'};
 mock.api.mockResolvedValueOnce({items:[proposal],next}).mockResolvedValueOnce({items:[{...proposal,status:'rejected',decision:{note:'Direct confirmation could not be independently verified',at:'2026-10-21T10:05:00Z',by_you:false}}],next:null});
 open();fireEvent.click(screen.getByText('Review exit proposals'));await screen.findByText('Older proposals');fireEvent.click(screen.getByText('Older proposals'));
 await screen.findByText('Direct confirmation could not be independently verified');expect(mock.api.mock.calls[1][1].body).toMatchObject({action:'read',before:next});expect(screen.queryByText('Older proposals')).toBeNull();expect(screen.queryByText('Approve assisted exit')).toBeNull();
});
it('clears previous history and paging after a failed older-page read',async()=>{
 mock.api.mockResolvedValueOnce({items:[proposal],next:{id:'older',at:'2026-10-21T09:00:00Z'}}).mockRejectedValueOnce(new Error('History unavailable'));
 open();fireEvent.click(screen.getByText('Review exit proposals'));await screen.findByText('Older proposals');fireEvent.click(screen.getByText('Older proposals'));await screen.findByText('History unavailable');expect(screen.queryByText('Spoke directly with passenger')).toBeNull();expect(screen.queryByText('Older proposals')).toBeNull();
});

it('notifies the case container after a successful decision but not failed attempts',async()=>{
 const changed=vi.fn();render(<CaseAssistedExit id="case" onChanged={changed}/>);fireEvent.change(screen.getByLabelText('Assisted-exit reason and evidence'),{target:{value:'Independently reviewed passenger confirmation'}});
 mock.api.mockResolvedValueOnce({items:[proposal]}).mockRejectedValueOnce(Error('Decision unavailable'));
 fireEvent.click(screen.getByText('Review exit proposals'));await screen.findByText('Approve assisted exit');expect(changed).not.toHaveBeenCalled();fireEvent.click(screen.getByText('Approve assisted exit'));await screen.findByText('Decision unavailable');expect(changed).not.toHaveBeenCalled();
 mock.api.mockResolvedValueOnce({items:[proposal]}).mockResolvedValueOnce({outcome:'approved'});fireEvent.click(screen.getByText('Review exit proposals'));await screen.findByText('Approve assisted exit');fireEvent.click(screen.getByText('Approve assisted exit'));await screen.findByText(/no money was moved/);expect(changed).toHaveBeenCalledOnce();
});
