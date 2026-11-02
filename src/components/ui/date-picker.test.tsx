import {useState} from 'react';
import {afterEach,expect,it} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {DatePicker} from './date-picker';
afterEach(cleanup);
it('calendar selection updates a controlled field and form submission without UTC conversion',async()=>{
 function Example(){const [value,setValue]=useState('2026-10-28');return <form aria-label="Date form"><label>Pickup date<DatePicker name="date" value={value} onChange={e=>setValue(e.target.value)}/></label><output>{value}</output></form>;}
 render(<Example/>);fireEvent.click(screen.getByRole('button',{name:'Open calendar'}));
 fireEvent.click(await screen.findByRole('button',{name:/October 29th, 2026/}));
 expect(screen.getByLabelText('Pickup date')).toHaveProperty('value','2026-10-29');
 expect(screen.getByText('2026-10-29')).toBeTruthy();
 expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('date')).toBe('2026-10-29');
});
it('preserves typing, required validity and disabled state',()=>{
 render(<label>From date<DatePicker name="from" required defaultValue="2026-10-28"/></label>);
 const input=screen.getByLabelText('From date') as HTMLInputElement;
 fireEvent.change(input,{target:{value:''}});expect(input.checkValidity()).toBe(false);
 fireEvent.change(input,{target:{value:'2026-10-30'}});expect(input.checkValidity()).toBe(true);
 cleanup();render(<DatePicker disabled/>);expect(screen.getByRole('button',{name:'Open calendar'})).toHaveProperty('disabled',true);
});
it('disables calendar days outside the supplied bounds',async()=>{
 render(<DatePicker defaultValue="2026-10-28" min="2026-10-28" max="2026-10-30"/>);
 fireEvent.click(screen.getByRole('button',{name:'Open calendar'}));
 expect(await screen.findByRole('button',{name:/October 27th, 2026/})).toHaveProperty('disabled',true);
});
