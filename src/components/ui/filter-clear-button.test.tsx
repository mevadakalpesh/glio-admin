import {afterEach,it,expect} from 'vitest';
import {cleanup,render,screen,fireEvent,waitFor} from '@testing-library/react';
import {useState} from 'react';
import {FilterClearButton} from './filter-clear-button';
afterEach(cleanup);
it('hides on empty filters, appears for drafts, and disappears after reset',async()=>{
 function Example(){const [key,setKey]=useState(0);return <form key={key}><input name="search" aria-label="Search"/><FilterClearButton active={false} fields={['search']} onClick={()=>setKey(v=>v+1)}>Clear filters</FilterClearButton></form>;}
 render(<Example/>);expect(screen.queryByRole('button')).toBeNull();fireEvent.change(screen.getByLabelText('Search'),{target:{value:'  '}});expect(screen.queryByRole('button')).toBeNull();fireEvent.change(screen.getByLabelText('Search'),{target:{value:'T0013'}});expect(screen.getByRole('button')).toBeTruthy();fireEvent.click(screen.getByRole('button'));await waitFor(()=>expect(screen.queryByRole('button')).toBeNull());expect(screen.getByLabelText('Search')).toHaveProperty('value','');
});
it('keeps clear available for applied filters even if the draft is erased',()=>{render(<form><input name="search"/><FilterClearButton active fields={['search']}>Clear</FilterClearButton></form>);expect(screen.getByRole('button',{name:'Clear'})).toBeTruthy();});
it('ignores fields outside the clear action scope',()=>{render(<form><input name="page" value="2" readOnly/><input name="status" value="open" readOnly/><FilterClearButton active={false} fields={['reference']}>Clear journey</FilterClearButton></form>);expect(screen.queryByRole('button')).toBeNull();});
