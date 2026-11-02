import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {HelpTopicHistory} from './HelpTopicHistory';
const mock=vi.hoisted(()=>({api:vi.fn()}));
vi.mock('./api',()=>({api:mock.api}));
vi.mock('./useAuth',()=>({useAuth:()=>({session:{csrf_token:'csrf',staff:{role:'owner'}}})}));
const earlier={category:'Rides',question:'How can I book?',answer:'The earlier customer guidance.',sort_order:1};
const topic={id:'booking-help',category:'Rides',question:'How can I book?',answer:'Current draft guidance.',sort_order:2,version:4,published:{...earlier,answer:'The live answer remains.'}};
const revision={id:'00000000-0000-4000-8000-000000000001',actor_id:'owner',created_at:'2026-10-22T05:00:00Z',action:'help.topic_save',reason:'Initial guidance creation',version:1,draft:earlier,published:null};
const history={items:[revision],page:1,has_more:true};
afterEach(()=>{cleanup();mock.api.mockReset();});
async function load(){fireEvent.change(screen.getByLabelText('History review reason'),{target:{value:'Investigate incorrect guidance'}});fireEvent.click(screen.getByText('Load revision history'));await screen.findByText('Compare version 1');}
it('requires audited review and comparison before versioned draft-only restore',async()=>{
 mock.api.mockResolvedValueOnce(history).mockResolvedValueOnce({version:5});const restored=vi.fn();
 render(<HelpTopicHistory topic={topic} close={()=>{}} restored={restored}/>);
 expect(screen.getByText('Load revision history')).toHaveProperty('disabled',true);expect(mock.api).not.toHaveBeenCalled();
 await load();expect(mock.api).toHaveBeenCalledWith('/help-topics/booking-help/history',expect.objectContaining({method:'POST',csrf:'csrf',body:{page:1,reason:'Investigate incorrect guidance'}}));
 fireEvent.click(screen.getByText('Compare version 1'));expect(screen.getByText('The live answer remains.')).toBeTruthy();expect(screen.getByText('Current draft guidance.')).toBeTruthy();
 expect(screen.getByText('Restore as draft')).toHaveProperty('disabled',true);
 fireEvent.change(screen.getByLabelText('Restore reason'),{target:{value:'Recover the earlier guidance'}});
 fireEvent.click(screen.getByText('Restore as draft'));fireEvent.click(screen.getByText('Restore as draft'));
 await waitFor(()=>expect(restored).toHaveBeenCalledTimes(1));expect(mock.api).toHaveBeenCalledTimes(2);
 expect(mock.api).toHaveBeenLastCalledWith('/help-topics/booking-help',expect.objectContaining({body:{action:'restore',version:4,revision_id:revision.id,reason:'Recover the earlier guidance'}}));
});
it('blocks uncertain restore retries until topic refresh',async()=>{
 mock.api.mockResolvedValueOnce(history).mockRejectedValueOnce(Error('Topic changed'));
 render(<HelpTopicHistory topic={topic} close={()=>{}} restored={()=>{}}/>);await load();
 fireEvent.click(screen.getByText('Compare version 1'));fireEvent.change(screen.getByLabelText('Restore reason'),{target:{value:'Recover the earlier guidance'}});fireEvent.click(screen.getByText('Restore as draft'));
 expect((await screen.findByRole('alert')).textContent).toContain('Close history and refresh topics');
 expect(screen.getByText('Restore as draft')).toHaveProperty('disabled',true);
});
it('paginates, clears selection and handles empty or failed history',async()=>{
 mock.api.mockResolvedValueOnce(history).mockResolvedValueOnce({items:[],page:2,has_more:false}).mockRejectedValueOnce(Error('History unavailable'));
 render(<HelpTopicHistory topic={topic} close={()=>{}} restored={()=>{}}/>);await load();fireEvent.click(screen.getByText('Compare version 1'));
 fireEvent.click(screen.getByText('Next revisions'));await screen.findByText('No recorded revisions on this page.');expect(screen.queryByText('Restore as draft')).toBeNull();
 fireEvent.click(screen.getByText('Previous revisions'));await screen.findByRole('alert');expect(screen.queryByText('Compare version 1')).toBeNull();
});
it('prevents restoring identical or current revisions',async()=>{
 mock.api.mockResolvedValueOnce({...history,items:[{...revision,draft:topic}]});
 render(<HelpTopicHistory topic={topic} close={()=>{}} restored={()=>{}}/>);await load();fireEvent.click(screen.getByText('Compare version 1'));
 fireEvent.change(screen.getByLabelText('Restore reason'),{target:{value:'Recover the earlier guidance'}});expect(screen.getByText('Restore as draft')).toHaveProperty('disabled',true);
});
it('aborts history requests on unmount without a late result',async()=>{
 mock.api.mockReturnValue(new Promise(()=>{}));const view=render(<HelpTopicHistory topic={topic} close={()=>{}} restored={()=>{}}/>);
 fireEvent.change(screen.getByLabelText('History review reason'),{target:{value:'Inspect recorded changes'}});fireEvent.click(screen.getByText('Load revision history'));
 const signal=mock.api.mock.calls[0][1].signal;view.unmount();expect(signal.aborted).toBe(true);
});
it('aborts a restore on unmount and ignores its late success',async()=>{
 let finish:(value:unknown)=>void=()=>{};const restored=vi.fn();
 mock.api.mockResolvedValueOnce(history).mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
 const view=render(<HelpTopicHistory topic={topic} close={()=>{}} restored={restored}/>);await load();
 fireEvent.click(screen.getByText('Compare version 1'));fireEvent.change(screen.getByLabelText('Restore reason'),{target:{value:'Recover the earlier guidance'}});fireEvent.click(screen.getByText('Restore as draft'));
 const signal=mock.api.mock.calls[1][1].signal;view.unmount();expect(signal.aborted).toBe(true);finish({version:5});
 await Promise.resolve();expect(restored).not.toHaveBeenCalled();
});
