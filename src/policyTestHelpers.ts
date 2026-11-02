import {screen,fireEvent} from '@testing-library/react';
export async function chooseActivation(){
 fireEvent.click(screen.getByLabelText('Activation date'));
 fireEvent.change(await screen.findByRole('combobox',{name:'Choose the Year'}),{target:{value:'2027'}});
 fireEvent.change(screen.getByRole('combobox',{name:'Choose the Month'}),{target:{value:'0'}});
 fireEvent.click(screen.getByRole('button',{name:/Friday, January 1st, 2027/}));
 fireEvent.change(screen.getByLabelText('Hour'),{target:{value:'11'}});
 fireEvent.change(screen.getByLabelText('Minute'),{target:{value:'30'}});
}
