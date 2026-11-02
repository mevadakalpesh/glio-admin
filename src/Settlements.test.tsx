import {addFilter} from "./filterTestHelpers";
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {Settlements} from './Settlements';
import {useRead} from './useRead';
const access=vi.hoisted(()=>({allowed:true}));
vi.mock('./useAuth',()=>({useAuth:()=>({session:{staff:{permissions:access.allowed?['settlements.read','journeys.read']:[]}}})}));
vi.mock('./useRead',()=>({useRead:vi.fn()}));
afterEach(()=>{cleanup();vi.resetAllMocks();access.allowed=true;});
const show=()=>render(<MemoryRouter initialEntries={['/?page=2']}><Settlements/></MemoryRouter>);
const data={items:[{id:'escrow',ride_request_id:'ride',state:'released',total_amount:'38.00',held_amount:'0.00',partial_refunded_amount:'0.00',traveler_amount:null,platform_fee:'0.00',allocation:'unavailable'}],total:26,page:2,page_size:25,generated_at:'2026-10-19T00:00:00Z'};
it('does not fetch without permission',()=>{access.allowed=false;show();expect(useRead).not.toHaveBeenCalled();});
it('shows recorded amounts without implying payout and resets page on filter change',async()=>{
 vi.mocked(useRead).mockReturnValue({key:'escrow',data});show();expect(screen.getByText(/Released does not establish bank receipt/)).toBeTruthy();expect(screen.getByText('Unavailable')).toBeTruthy();expect(screen.getAllByText('₹0.00')).toHaveLength(3);expect(screen.getByText('View ride').getAttribute('href')).toContain('kind=rides&id=ride');
 await addFilter('Recorded state'); await userEvent.selectOptions(screen.getByLabelText('Recorded state'),'frozen');expect(useRead).toHaveBeenLastCalledWith('/settlements?state=frozen',0);
 await userEvent.click(screen.getByText('Refresh settlements'));expect(useRead).toHaveBeenLastCalledWith('/settlements?state=frozen',1);
});
it('distinguishes failed, loading and empty results',()=>{
 vi.mocked(useRead).mockReturnValue(null);const view=show();expect(screen.getByRole('status')).toBeTruthy();
 vi.mocked(useRead).mockReturnValue({key:'escrow',error:'Unavailable'});view.rerender(<MemoryRouter><Settlements/></MemoryRouter>);expect(screen.getByRole('alert')).toBeTruthy();expect(screen.queryByText(/No ride escrow records/)).toBeNull();
 vi.mocked(useRead).mockReturnValue({key:'escrow',data:{...data,items:[]}});view.rerender(<MemoryRouter><Settlements/></MemoryRouter>);expect(screen.getByText(/No ride escrow records/)).toBeTruthy();
});

it('shows the remaining hold separately from the original fare and refund',()=>{vi.mocked(useRead).mockReturnValue({key:'escrow',data:{...data,items:[{...data.items[0],state:'partial_refund_review',partial_refunded_amount:'10.00',held_amount:'28.00'}]}});show();expect(screen.getByText('₹38.00')).toBeTruthy();expect(screen.getByText('₹10.00')).toBeTruthy();expect(screen.getByText('₹28.00')).toBeTruthy();expect(screen.getByText(/Remaining funds stay held/)).toBeTruthy();});
