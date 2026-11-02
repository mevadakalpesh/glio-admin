import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
export async function addFilter(label:string) {
 if(screen.queryByLabelText(label)) return;
 await userEvent.click(screen.getByRole('button',{name:'Filters'}));
 await userEvent.click(screen.getByRole('button',{name:label}));
}
