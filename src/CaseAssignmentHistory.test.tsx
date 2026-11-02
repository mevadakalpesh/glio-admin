import {it,expect,vi,afterEach} from "vitest";
import {render,screen,cleanup,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {CaseAssignmentHistory} from "./CaseAssignmentHistory";
import {api} from "./api";
const access=vi.hoisted(()=>({allowed:true}));
vi.mock("./useAuth",()=>({useAuth:()=>({session:{staff:{permissions:access.allowed?["cases.assignment-history.read"]:[]}}})}));
vi.mock("./api",()=>({api:vi.fn()}));
afterEach(()=>{cleanup();vi.resetAllMocks();access.allowed=true;});
const result={items:[{id:'event',action:'Case claimed',reason:'<script>private statement</script>',performed_by_you:true,version:1,created_at:'2026-10-18T00:00:00Z'}],page:1,page_size:25,total:26};
it('loads only on explicit open, renders reasons as text and supports pagination',async()=>{
 vi.mocked(api).mockResolvedValue(result);render(<CaseAssignmentHistory id="case"/>);expect(api).not.toHaveBeenCalled();
 await userEvent.click(screen.getByText('View assignment history'));await screen.findByText('Case claimed');expect(screen.getByText(result.items[0].reason).querySelector('script')).toBeNull();
 await userEvent.click(screen.getByText('Next history'));await waitFor(()=>expect(api).toHaveBeenLastCalledWith('/ride-cases/case/assignment/history?page=2',expect.anything()));
 await userEvent.click(screen.getByText('Hide assignment history'));expect(screen.queryByText('Case claimed')).toBeNull();
});
it('does not fetch without history permission',()=>{access.allowed=false;render(<CaseAssignmentHistory id="case"/>);expect(api).not.toHaveBeenCalled();expect(screen.queryByText('View assignment history')).toBeNull();});
it('allows retry after read failure and shows empty history',async()=>{
 vi.mocked(api).mockRejectedValueOnce(Error('Unavailable')).mockResolvedValueOnce({...result,items:[],total:0});render(<CaseAssignmentHistory id="case"/>);
 await userEvent.click(screen.getByText('View assignment history'));await screen.findByRole('alert');await userEvent.click(screen.getByText('Refresh history'));await screen.findByText('No recorded assignment changes.');
});
