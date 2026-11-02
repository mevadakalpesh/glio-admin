import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {Reports} from './Reports';
const mock=vi.hoisted(()=>({api:vi.fn(),permissions:['reports.read','reports.export']}));
vi.mock('./api',()=>({api:mock.api}));vi.mock('./useAuth',()=>({useAuth:()=>({session:{csrf_token:'csrf',staff:{permissions:mock.permissions}}})}));
const summary={total:0,cancelled:0,completed:0,statuses:[]};
const result={filters:{from:'2026-10-20',to:'2026-10-21',state:''},daily:[{date:'2026-10-20',trips:0,rides:0}],trips:summary,rides:summary,states:[{code:'GJ',name:'Gujarat'}],scope:'All regions',date_basis:'Created date; current status.',generated_at:'2026-10-21T10:00:00Z'};
function mount(){render(<MemoryRouter initialEntries={['/reports?from=2026-10-20&to=2026-10-21']}><Reports/></MemoryRouter>);}
afterEach(()=>{cleanup();mock.api.mockReset();mock.permissions=['reports.read','reports.export'];vi.restoreAllMocks();});
it('renders empty real aggregates and applies explicit dates and state',async()=>{mock.api.mockResolvedValue(result);mount();await screen.findByText(/No journeys were created/);expect(mock.api.mock.calls[0][0]).toBe('/reports/journeys?from=2026-10-20&to=2026-10-21&state=');fireEvent.change(screen.getByLabelText('State'),{target:{value:'GJ'}});await waitFor(()=>expect(mock.api).toHaveBeenLastCalledWith('/reports/journeys?from=2026-10-20&to=2026-10-21&state=GJ',expect.anything()));});
it('clears prior aggregates on refresh failure and offers no stale export',async()=>{mock.api.mockResolvedValueOnce(result).mockRejectedValueOnce(Error('Report unavailable'));mount();await screen.findByText(/No journeys were created/);fireEvent.click(screen.getByText('Refresh report'));await screen.findByRole('alert');expect(screen.queryByText('Download CSV')).toBeNull();expect(screen.queryByText('Daily created journeys (IST)')).toBeNull();});
it('enforces UI access without reading and hides exports without permission',async()=>{mock.permissions=[];mount();expect(mock.api).not.toHaveBeenCalled();expect(screen.getByText(/do not have access/)).toBeTruthy();cleanup();mock.permissions=['reports.read'];mock.api.mockResolvedValue(result);mount();await screen.findByText(/No journeys were created/);expect(screen.queryByLabelText('Export reason')).toBeNull();});
it('exports only after reason and successful audited response',async()=>{mock.api.mockResolvedValueOnce(result).mockResolvedValueOnce({...result,csv:'data',filename:'gilo-report.csv'});const create=vi.fn(()=> 'blob:report');Object.defineProperty(URL,'createObjectURL',{configurable:true,value:create});Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:vi.fn()});const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});mount();await waitFor(()=>expect(screen.getByRole('button',{name:'Export report'})).toHaveProperty('disabled',false));fireEvent.click(screen.getByRole('button',{name:'Export report'}));await screen.findByText('Download CSV');expect(screen.getByText('Download CSV').closest('button')?.disabled).toBe(true);fireEvent.change(screen.getByLabelText('Export reason'),{target:{value:'Review operational demand'}});fireEvent.click(screen.getByText('Download CSV'));await screen.findByText(/CSV generated from a fresh snapshot/);expect(mock.api.mock.calls[1][1]).toMatchObject({method:'POST',csrf:'csrf',body:{filters:result.filters,reason:'Review operational demand'}});expect(create).toHaveBeenCalledOnce();expect(click).toHaveBeenCalledOnce();});
it('does not download when export audit/API fails',async()=>{mock.api.mockResolvedValueOnce(result).mockRejectedValueOnce(Error('Export unavailable'));const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});mount();await waitFor(()=>expect(screen.getByRole('button',{name:'Export report'})).toHaveProperty('disabled',false));fireEvent.click(screen.getByRole('button',{name:'Export report'}));await screen.findByText('Download CSV');fireEvent.change(screen.getByLabelText('Export reason'),{target:{value:'Review operational demand'}});fireEvent.click(screen.getByText('Download CSV'));await screen.findByText('Export unavailable');expect(click).not.toHaveBeenCalled();});
it('keeps export in a modal and clears the reason on close',async()=>{
 mock.api.mockResolvedValue(result);mount();
 await waitFor(()=>expect(screen.getByRole('button',{name:'Export report'})).toHaveProperty('disabled',false));
 expect(screen.queryByLabelText('Export reason')).toBeNull();
 expect(screen.queryByText('Apply report filters')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Export report'}));
 expect(await screen.findByRole('dialog')).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Export reason'),{target:{value:'A temporary reason'}});
 fireEvent.click(screen.getByRole('button',{name:'Close dialog'}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
 fireEvent.click(screen.getByRole('button',{name:'Export report'}));
 expect(await screen.findByLabelText('Export reason')).toHaveProperty('value','');
});
