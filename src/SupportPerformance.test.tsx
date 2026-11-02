import {selectDateRange} from './test/select-date-range';
vi.mock('./SupportPerformanceExport',()=>({SupportPerformanceExport:()=>null}));
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {SupportPerformance} from './SupportPerformance';
const mock=vi.hoisted(()=>({api:vi.fn()}));vi.mock('./api',()=>({api:mock.api}));
afterEach(()=>{cleanup();mock.api.mockReset();});
const report={filters:{from:'2026-10-01',to:'2026-10-01'},counts:{total:2,responded:1,without_recorded_response:1,resolved_once:1,reopened:1,active:2,terminal_without_resolution:0},timings:{response_minutes:30,resolution_minutes:60},daily:[{date:'2026-10-01',count:2}],scope:'Assigned states',generated_at:'2026-10-22T00:00:00Z'};
function mount(){render(<MemoryRouter><SupportPerformance/></MemoryRouter>);}
function run(){selectDateRange('Support report date range (IST)','2026-10-01');fireEvent.click(screen.getByText('Run support report'));}
it('runs an explicit date cohort with definitions, timing denominators and queue links',async()=>{mock.api.mockResolvedValue(report);mount();expect(mock.api).not.toHaveBeenCalled();run();await screen.findByText('30 min');expect(mock.api).toHaveBeenCalledWith('/support-tickets/performance?from=2026-10-01&to=2026-10-01',expect.anything());expect(screen.getByText('Average first response · 1 tickets')).toBeTruthy();expect(screen.getByRole('link',{name:'View 2026-10-01 tickets'}).getAttribute('href')).toBe('/support/tickets?created_from=2026-10-01&created_to=2026-10-01');expect(screen.getByText(/Missing history does not prove/)).toBeTruthy();});
it('failed refresh removes prior metrics',async()=>{mock.api.mockResolvedValueOnce(report).mockRejectedValueOnce(Error('Service unavailable'));mount();run();await screen.findByText('30 min');fireEvent.click(screen.getByText('Refresh support report'));await screen.findByRole('alert');expect(screen.queryByText('30 min')).toBeNull();});
it('empty timings are not displayed as zero and failed date change clears previous report',async()=>{mock.api.mockResolvedValueOnce({...report,timings:{response_minutes:null,resolution_minutes:null}}).mockRejectedValueOnce(Error('Choose valid dates'));mount();run();await screen.findAllByText('Not recorded');selectDateRange('Support report date range (IST)','2026-10-02');fireEvent.click(screen.getByText('Run support report'));await screen.findByRole('alert');expect(screen.queryByText('Daily ticket intake')).toBeNull();});
it('unmount aborts report reads',async()=>{mock.api.mockReturnValue(new Promise(()=>{}));mount();run();await waitFor(()=>expect(mock.api).toHaveBeenCalled());const signal=mock.api.mock.calls[0][1].signal;cleanup();expect(signal.aborted).toBe(true);});
