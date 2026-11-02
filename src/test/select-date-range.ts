import {fireEvent,screen} from '@testing-library/react';
import {vi} from 'vitest';
export function selectDateRange(label:string,from:string,to=from){
 const clock=vi.spyOn(Date,'now').mockReturnValue(Date.parse(from+'T06:00:00Z'));
 try{
  fireEvent.click(screen.getByRole('button',{name:label}));
  fireEvent.click(screen.getByRole('button',{name:'Today'}));
  if(from!==to){
   fireEvent.click(screen.getByRole('button',{name:'Clear dates'}));
   for(const value of [from,to]){
    const day=document.querySelector(`button[data-day="${new Date(value+'T12:00:00').toLocaleDateString()}"]`);
    if(!day)throw new Error('Calendar date is not visible: '+value);
    fireEvent.click(day);
   }
  }
  fireEvent.click(screen.getByRole('button',{name:'Done'}));
 }finally{clock.mockRestore();}
}
