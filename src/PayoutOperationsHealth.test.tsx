import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {PayoutOperationsHealth} from './PayoutOperationsHealth';
const state=vi.hoisted(()=>({allowed:true,data:null as unknown,error:''}));
vi.mock('./useAuth',()=>({useAuth:()=>({session:{staff:{permissions:state.allowed?['payouts.withdrawals.manage']:[]}}})}));
vi.mock('./useRead',()=>({useRead:()=>state.error?{error:state.error}:state.data?{data:state.data}:null}));
afterEach(()=>{cleanup();state.allowed=true;state.data=null;state.error=''});
function open(){render(<MemoryRouter><PayoutOperationsHealth/></MemoryRouter>)}
const snapshot={generated_at:'2026-10-25T10:00:00Z',switches:{read:false,recovery:false,dispatch:false,webhook:false},counts:{recorded:0,unconfirmed:0,overdue:0},oldest_unconfirmed_at:null,last_recorded_webhook_at:null,worker:{status:'disabled',started_at:null,finished_at:null,last_observation_status:'never_recorded'}};
it('hides monitoring from unauthorized staff',()=>{state.allowed=false;open();expect(screen.getByText(/do not have access/)).toBeTruthy();expect(screen.queryByText('Refresh operations evidence')).toBeNull()});
it('shows unavailable states instead of fabricated zeros on errors',()=>{state.error='Monitoring unavailable';open();expect(screen.getByRole('alert').textContent).toBe('Monitoring unavailable');expect(screen.queryByText('Recorded attempts')).toBeNull()});
it('distinguishes disabled recovery and absent receipts from recorded zero counts',()=>{state.data=snapshot;open();expect(screen.getByText('Recovery disabled')).toBeTruthy();expect(screen.getByText('Latest stored transfer webhook').parentElement?.textContent).toContain('Not recorded');expect(screen.getAllByText('0')).toHaveLength(3);fireEvent.click(screen.getByText('Refresh operations evidence'));expect(screen.getByText('Open recovery inbox')).toBeTruthy()});
it('makes stale worker activity explicit',()=>{state.data={...snapshot,worker:{...snapshot.worker,status:'stale'}};open();expect(screen.getByText('Worker activity stale')).toBeTruthy()});

it('renders operational settings read-only with clear navigation',()=>{state.data={...snapshot,switches:{read:true,recovery:false,dispatch:false,webhook:true}};open();expect(screen.getByText('Provider status checks')).toBeTruthy();expect(screen.getByText('Transfer dispatch')).toBeTruthy();expect(screen.queryByRole('switch')).toBeNull();expect(screen.getByRole('link',{name:'Open payout checks'}).getAttribute('href')).toBe('/withdrawal-payouts');expect(screen.getByRole('link',{name:'Open recovery inbox'}).getAttribute('href')).toBe('/payout-recovery');});
