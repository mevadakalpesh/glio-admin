import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import {Tracking} from './Tracking';
import {useVisibleSnapshot} from './useVisibleSnapshot';
const access=vi.hoisted(()=>({allowed:true,cases:false}));
vi.mock('./useAuth',()=>({useAuth:()=>({session:{staff:{permissions:access.allowed?['tracking.live.read','journeys.read',...(access.cases?['cases.read']:[])]:[]}}})}));
vi.mock('./useVisibleSnapshot',()=>({useVisibleSnapshot:vi.fn()}));
afterEach(()=>{cleanup();vi.resetAllMocks();access.allowed=true;access.cases=false;});
const show=()=>render(<MemoryRouter><Tracking/></MemoryRouter>);
it('denies reads without permission',()=>{access.allowed=false;show();expect(useVisibleSnapshot).not.toHaveBeenCalled();});
it('distinguishes old GPS from recent heartbeats without claiming real-time tracking',async()=>{
 const refresh=vi.fn();vi.mocked(useVisibleSnapshot).mockReturnValue({refresh,result:{key:'tracking',data:{items:[{id:'trip',reference:'T0013',status:'STARTED',started_at:null,gps:{state:'stale',recorded_at:null,age_seconds:400},heartbeat:{state:'recent',recorded_at:null,age_seconds:1},tracking_reported:true}],page:1,page_size:25,total:1,generated_at:'2026-10-19T00:00:00Z',freshness_seconds:60}}});
 show();expect(screen.getByText('Stale record')).toBeTruthy();expect(screen.getByText('Recent record')).toBeTruthy();expect(screen.getByText(/not proof of a recent location/)).toBeTruthy();expect(screen.getByText('400 seconds old at snapshot')).toBeTruthy();
 await userEvent.click(screen.getByText('Refresh tracking'));expect(refresh).toHaveBeenCalledOnce();
});

it('offers trip case handoff only with case permission',async()=>{
 vi.mocked(useVisibleSnapshot).mockReturnValue({refresh:vi.fn(),result:{key:'tracking',data:{items:[{id:'trip',reference:'T0013',status:'STARTED',started_at:null,gps:{state:'missing',recorded_at:null,age_seconds:null},heartbeat:{state:'missing',recorded_at:null,age_seconds:null},tracking_reported:false}],page:1,page_size:25,total:1,generated_at:'2026-10-19T00:00:00Z',freshness_seconds:60}}});
 const view=show();await userEvent.click(screen.getByRole('button',{name:'Actions for T0013'}));expect(screen.queryByText('Review trip cases')).toBeNull();view.unmount();access.cases=true;show();await userEvent.click(screen.getByRole('button',{name:'Actions for T0013'}));expect((await screen.findByText('Review trip cases')).getAttribute('href')).toBe('/support?trip_reference=T0013');
});
