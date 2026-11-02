import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {AdminTable} from './admin-table';
afterEach(cleanup);
it('hides only the selected column while retaining record identity and action handlers',async()=>{
 const action=vi.fn();render(<AdminTable><thead><tr><th>Record</th><th>Amount</th><th>Actions</th></tr></thead><tbody><tr><td>R0001</td><td>₹20.00</td><td><button onClick={action}>Inspect</button></td></tr></tbody></AdminTable>);
 await userEvent.click(screen.getByRole('button',{name:'Columns'}));
 await userEvent.click(await screen.findByRole('checkbox',{name:'Amount'}));
 expect(screen.queryByText('₹20.00')).toBeNull();expect(screen.getByText('R0001')).toBeTruthy();
 expect(screen.queryByRole('checkbox',{name:'Actions'})).toBeNull();
 await userEvent.keyboard('{Escape}');await userEvent.click(screen.getByRole('button',{name:'Inspect'}));expect(action).toHaveBeenCalledOnce();
 await userEvent.click(screen.getByRole('button',{name:'Columns'}));await userEvent.click(await screen.findByRole('button',{name:'Reset columns'}));expect(screen.getByText('₹20.00')).toBeTruthy();
});
it('does not offer ambiguous controls for grouped headings',()=>{
 render(<AdminTable><thead><tr><th colSpan={2}>Money</th></tr><tr><th>Amount</th><th>Fee</th></tr></thead><tbody><tr><td>20</td><td>2</td></tr></tbody></AdminTable>);
 expect(screen.queryByRole('button',{name:'Columns'})).toBeNull();expect(screen.getByText('20')).toBeTruthy();
});
