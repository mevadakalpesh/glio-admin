import userEvent from '@testing-library/user-event';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {PayoutRecovery} from './PayoutRecovery';
import {api,ApiError} from './api';
const access=vi.hoisted(()=>({allowed:true}));
vi.mock('./useAuth',()=>({useAuth:()=>({session:{csrf_token:'csrf',staff:{id:'owner',permissions:access.allowed?['payouts.withdrawals.manage']:[]}}})}));
vi.mock('./api',async()=>({...await vi.importActual<typeof import('./api')>('./api'),api:vi.fn()}));
afterEach(()=>{cleanup();vi.resetAllMocks();access.allowed=true});
const item={id:'payout',request_id:'request',amount:'25.00',status:'pending',accounting_state:'reserved',version:3,signals:['overdue_check'],case:null};
const list={items:[item],page:1,has_more:false};
const detail={item,history:[],history_truncated:false};
function open(){render(<MemoryRouter><PayoutRecovery/></MemoryRouter>)}
async function inspect(){
 await userEvent.click(await screen.findByRole('button',{name:'Actions for payout payout'}));await userEvent.click(await screen.findByRole('menuitem',{name:'Review case'}));
 fireEvent.change(screen.getByLabelText('Investigation reason or note'),{target:{value:'Investigate delayed payout'}});
 fireEvent.click(screen.getByText('Inspect current evidence'));await screen.findByText('Take ownership');
}
it('denies controls without permission',()=>{access.allowed=false;open();expect(api).not.toHaveBeenCalled()});
it('requires inspection and sends server versions when claiming',async()=>{
 vi.mocked(api).mockResolvedValueOnce(list).mockResolvedValueOnce(detail).mockResolvedValueOnce({}).mockResolvedValue(list);
 open();await inspect();fireEvent.click(screen.getByText('Take ownership'));
 await screen.findByText(/Recovery case updated/);
 expect(vi.mocked(api).mock.calls[2][1]?.body).toMatchObject({action:'claim',id:'payout',version:0,payout_version:3,reason:'Investigate delayed payout',operation_id:expect.any(String)});
});
it('blocks closure while recovery signals remain',async()=>{
 vi.mocked(api).mockResolvedValueOnce(list).mockResolvedValueOnce({...detail,item:{...item,case:{owner_id:'owner',status:'escalated',version:2}}});
 open();await inspect();expect((screen.getByText('Close after verification') as HTMLButtonElement).disabled).toBe(true);
});
it('uncertain updates reuse operation identity and block other commands',async()=>{
 vi.mocked(api).mockResolvedValueOnce(list).mockResolvedValueOnce(detail).mockRejectedValueOnce(new ApiError('Unavailable',503)).mockResolvedValueOnce({}).mockResolvedValue(list);
 open();await inspect();fireEvent.click(screen.getByText('Take ownership'));await screen.findByText('Retry same operation');
 const original=vi.mocked(api).mock.calls[2][1]?.body;expect((screen.getByText('Refresh inbox') as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByText('Retry same operation'));await waitFor(()=>expect(api).toHaveBeenCalledTimes(5));expect(vi.mocked(api).mock.calls[3][1]?.body).toEqual(original);
});

it('applies queue changes immediately and only shows reset for a nondefault queue',async()=>{vi.mocked(api).mockResolvedValue({...list,items:[]});open();await screen.findByText('No payouts match this queue.');expect(screen.queryByLabelText('Reset queue filter')).toBeNull();fireEvent.change(screen.getByLabelText('Recovery filter'),{target:{value:'all'}});await waitFor(()=>expect(vi.mocked(api).mock.lastCall?.[1]?.body).toMatchObject({action:'list',filter:'all',page:1}));fireEvent.click(screen.getByLabelText('Reset queue filter'));await waitFor(()=>expect(vi.mocked(api).mock.lastCall?.[1]?.body).toMatchObject({filter:'attention',page:1}));expect(screen.queryByLabelText('Reset queue filter')).toBeNull()});
