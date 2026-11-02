import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import {SettlementLedger} from './SettlementLedger';
import {useRead} from './useRead';
const access=vi.hoisted(()=>({allowed:true}));
vi.mock('./useAuth',()=>({useAuth:()=>({session:{staff:{permissions:access.allowed?['ledger.read']:[]}}})}));
vi.mock('./useRead',()=>({useRead:vi.fn()}));
afterEach(()=>{cleanup();vi.resetAllMocks();access.allowed=true;});
it('denies fetching without ledger permission',()=>{access.allowed=false;render(<SettlementLedger id="escrow"/>);expect(useRead).not.toHaveBeenCalled();});
it('shows historical balances accurately and scopes fetching to selected escrow',()=>{
 vi.mocked(useRead).mockReturnValue({key:'ledger',data:{items:[{id:'entry',participant:'Rider',type:'refund',status:'success',amount:'-38.00',balance_before:null,balance_after:'0.00',created_at:null}],page:1,page_size:25,total:1}});
 const view=render(<SettlementLedger id="first"/>);expect(useRead).toHaveBeenLastCalledWith('/settlements/first/ledger?page=1',0);expect(screen.getByText('Unavailable')).toBeTruthy();expect(screen.getByText('₹0.00')).toBeTruthy();expect(screen.getByText('-₹38.00')).toBeTruthy();expect(screen.getByText(/not current spendable balances/)).toBeTruthy();
 view.rerender(<SettlementLedger id="second"/>);expect(useRead).toHaveBeenLastCalledWith('/settlements/second/ledger?page=1',0);
});
it('does not imply no payment when no ledger link exists',()=>{vi.mocked(useRead).mockReturnValue({key:'ledger',data:{items:[],page:1,page_size:25,total:0}});render(<SettlementLedger id="escrow"/>);expect(screen.getByText(/Missing entries do not prove/)).toBeTruthy();expect(screen.getByText('No explicitly linked wallet entries were found.')).toBeTruthy();});

it('distinguishes a zero hold release from a payout and preserves recorded status',()=>{
 vi.mocked(useRead).mockReturnValue({key:'ledger',data:{items:[{id:'hold',participant:'Rider',type:'escrow_release',purpose:'Remaining hold release (no additional debit)',status:'success',amount:'0.00',balance_before:'50.00',balance_after:'50.00',created_at:null},{id:'payout',participant:'Traveler',type:'escrow_release',purpose:'Traveler remainder payout',status:'pending',amount:'17.00',balance_before:'0.00',balance_after:'17.00',created_at:null}],page:1,page_size:25,total:2}});
 render(<SettlementLedger id="escrow"/>);expect(screen.getByText('Remaining hold release (no additional debit)')).toBeTruthy();expect(screen.getByText('Traveler remainder payout')).toBeTruthy();expect(screen.getByText('escrow release · pending')).toBeTruthy();expect(screen.getByText('escrow release · success')).toBeTruthy();
});
