import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {CaseIntake} from './CaseIntake';
const mock=vi.hoisted(()=>({api:vi.fn(),allowed:true}));
vi.mock('./api',()=>({api:mock.api}));
vi.mock('./useAuth',()=>({useAuth:()=>({session:{csrf_token:'csrf',staff:{permissions:mock.allowed?['cases.create']:[]}}})}));
afterEach(()=>{cleanup();mock.api.mockReset();mock.allowed=true;});
function open(){render(<MemoryRouter><CaseIntake rideId="ride"/></MemoryRouter>);fireEvent.click(screen.getByText('Report ride issue'));fireEvent.change(screen.getByLabelText('Reported facts'),{target:{value:'Passenger called about delayed pickup'}});}
it('does not write on opening and hides form without permission',()=>{open();expect(mock.api).not.toHaveBeenCalled();expect(screen.getByText(/eligible funds may be held/)).toBeTruthy();cleanup();mock.allowed=false;render(<CaseIntake rideId="ride"/>);expect(screen.queryByText('Report ride issue')).toBeNull();});
it('keeps the request ID on retry and links to saved case',async()=>{mock.api.mockResolvedValueOnce({revision:'rev'}).mockRejectedValueOnce(Error('Network interrupted')).mockResolvedValueOnce({case_id:'case'});open();fireEvent.click(screen.getByText('Preview incident'));await screen.findByText('Confirm incident');fireEvent.click(screen.getByText('Confirm incident'));await screen.findByText('Network interrupted');const first=mock.api.mock.calls[1][1].body;expect(first.kind).toBe('pickup_problem');expect(first.operation_id).toBeTruthy();fireEvent.click(screen.getByText('Confirm incident'));expect((await screen.findByText('Open case for review')).getAttribute('href')).toBe('/support?case=case');expect(mock.api.mock.calls[2][1].body.operation_id).toBe(first.operation_id);expect(screen.queryByText('Confirm incident')).toBeNull();});
it('aborts pending response handling on unmount',()=>{mock.api.mockReturnValue(new Promise(()=>{}));open();fireEvent.click(screen.getByText('Preview incident'));const signal=mock.api.mock.calls[0][1].signal;cleanup();expect(signal.aborted).toBe(true);});
