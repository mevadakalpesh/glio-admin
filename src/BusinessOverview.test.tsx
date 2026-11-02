import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {BusinessOverview} from './BusinessOverview';
vi.mock('./useAuth',()=>({useAuth:()=>({session:{staff:{permissions:[]}}})}));
afterEach(cleanup);
it('distinguishes confirmed payment volume from unavailable revenue',()=>{
 render(<MemoryRouter><BusinessOverview version={0} data={{customers:{total:5,new_last_30_days:2,latest:[]},live_payments:{records:3,gross:'1200.00'},basis:'all time',revenue_available:false}}/></MemoryRouter>);
 expect(screen.getByText('₹1,200.00')).toBeTruthy();
 expect(screen.getByText('Verified net revenue reporting is not configured')).toBeTruthy();
 expect(screen.queryByText('Support alerts')).toBeNull();
});
it('does not expose global panels without authorized summary data',()=>{
 render(<MemoryRouter><BusinessOverview version={0} data={null}/></MemoryRouter>);
 expect(screen.queryByText('Total customers')).toBeNull();expect(screen.queryByText('Live payment volume')).toBeNull();
});
