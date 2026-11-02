import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {TripTrackingPage} from './TripTrackingPage';
import {useVisibleSnapshot} from './useVisibleSnapshot';
const access=vi.hoisted(()=>({permissions:['journeys.read','tracking.evidence.read','tracking.live.read']}));
vi.mock('./useAuth',()=>({useAuth:()=>({session:{staff:access}})}));
vi.mock('./useVisibleSnapshot',()=>({useVisibleSnapshot:vi.fn()}));
vi.mock('./TrackingLive',()=>({TrackingLive:()=> <div>Live location panel</div>}));
vi.mock('./TripOperations',()=>({TripOperations:()=> <div>Traveler and passenger details</div>}));
afterEach(()=>{cleanup();vi.clearAllMocks();access.permissions=['journeys.read','tracking.evidence.read','tracking.live.read'];});
function show(status='STARTED'){
 vi.mocked(useVisibleSnapshot).mockReturnValue({refresh:vi.fn(),result:{key:'trip',data:{journey:{reference:'T0001',status:2,status_label:status,origin:{city:'Chuli'},destination:{city:'Halvad'}}}}});
 render(<MemoryRouter><TripTrackingPage id="trip"/></MemoryRouter>);
}
it('requires journey and evidence access before reading trip data',()=>{access.permissions=[];show();expect(useVisibleSnapshot).not.toHaveBeenCalled();expect(screen.queryByText('Live location panel')).toBeNull();});
it('shows route and linked operations for the selected trip',()=>{show();expect(useVisibleSnapshot).toHaveBeenCalledWith('/journeys/trips/trip?linked_page=1',30000,true);expect(screen.getByText('Chuli → Halvad')).toBeTruthy();expect(screen.getByText('Live location panel')).toBeTruthy();expect(screen.getByText('Traveler & vehicle')).toBeTruthy();expect(screen.getByText('Journey timeline')).toBeTruthy();});
it('does not start live viewing for a completed trip',()=>{show('COMPLETED');expect(screen.queryByText('Live location panel')).toBeNull();expect(screen.getByRole('status').textContent).toContain('Trip completed');expect(screen.getByRole('button',{name:'View recorded locations'})).toBeTruthy();});
