import {it,expect,vi,afterEach} from "vitest";
import {render,screen,cleanup,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {CaseReassignment} from "./CaseReassignment";
import {api} from "./api";
const access=vi.hoisted(()=>({allowed:true}));
vi.mock("./useAuth",()=>({useAuth:()=>({session:{csrf_token:'csrf',staff:{permissions:access.allowed?['cases.reassign']:[]}}})}));
vi.mock("./api",()=>({api:vi.fn()}));
afterEach(()=>{cleanup();vi.resetAllMocks();access.allowed=true;});
const staff={items:[{id:'target',name:'Case reviewer',role:'owner',is_you:false}],page:1,page_size:25,total:1};
it('fetches only when opened and confirms the selected recipient and version before sending',async()=>{
 const done=vi.fn();vi.mocked(api).mockResolvedValueOnce(staff).mockResolvedValueOnce({});render(<CaseReassignment id="case" version={7} onFinished={done}/>);
 expect(api).not.toHaveBeenCalled();await userEvent.click(screen.getByText('Assign to a staff member'));
 await screen.findByLabelText('Staff member');await userEvent.selectOptions(screen.getByLabelText('Staff member'),'target');await userEvent.type(screen.getByLabelText('Reassignment reason'),'Transfer workload for review');
 await userEvent.click(screen.getByText('Review reassignment'));expect(api).toHaveBeenCalledTimes(1);
 await userEvent.click(screen.getByText('Confirm reassignment'));await waitFor(()=>expect(done).toHaveBeenCalledWith());
 expect(api).toHaveBeenCalledWith('/ride-cases/case/assignment',expect.objectContaining({method:'POST',csrf:'csrf',body:{action:'reassign',staff_id:'target',version:7,reason:'Transfer workload for review'}}));
});
it('does not expose reassignment without permission',()=>{access.allowed=false;render(<CaseReassignment id="case" version={0} onFinished={()=>{}}/>);expect(api).not.toHaveBeenCalled();expect(screen.queryByText('Assign to a staff member')).toBeNull();});
it('reports a stale assignment instead of success',async()=>{
 const done=vi.fn();vi.mocked(api).mockResolvedValueOnce(staff).mockRejectedValueOnce(Error('Assignment changed.'));render(<CaseReassignment id="case" version={0} onFinished={done}/>);
 await userEvent.click(screen.getByText('Assign to a staff member'));await screen.findByLabelText('Staff member');await userEvent.selectOptions(screen.getByLabelText('Staff member'),'target');await userEvent.type(screen.getByLabelText('Reassignment reason'),'Review workload');await userEvent.click(screen.getByText('Review reassignment'));await userEvent.click(screen.getByText('Confirm reassignment'));
 await waitFor(()=>expect(done).toHaveBeenCalledWith('Assignment changed.'));expect(done).not.toHaveBeenCalledWith();
});
it('handles unavailable and empty staff lists without enabling submission',async()=>{
 vi.mocked(api).mockRejectedValueOnce(Error('Unavailable')).mockResolvedValueOnce({...staff,items:[],total:0});render(<CaseReassignment id="case" version={0} onFinished={()=>{}}/>);
 await userEvent.click(screen.getByText('Assign to a staff member'));await screen.findByRole('alert');await userEvent.click(screen.getByText('Refresh staff'));await screen.findByText('No eligible staff on this page.');expect(screen.getByText('Review reassignment')).toHaveProperty('disabled',true);
});
