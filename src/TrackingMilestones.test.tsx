import {render,screen} from '@testing-library/react';
import {it,expect} from 'vitest';
import {TrackingMilestones} from './TrackingMilestones';
it('shows recorded and scheduled milestones without assuming drop completion from GPS progress',()=>{
 render(<TrackingMilestones startedAt="2026-11-01T05:00:00Z" progress={100} stops={[{id:'p',ride_id:'r',kind:'pickup',latitude:23,longitude:71,label:'R0001 · Pickup',address:'Soladi',status:'BOOKED',scheduled_at:'2026-11-01T05:30:00Z'},{id:'d',ride_id:'r',kind:'drop',latitude:23,longitude:72,label:'R0001 · Drop-off',address:'Chuli',status:'BOOKED'}]}/>);
 expect(screen.getByText('Trip start')).toBeTruthy();expect(screen.getByText('Trip end')).toBeTruthy();
 expect(screen.getByText(/Scheduled$/)).toBeTruthy();expect(screen.getByText(/Recorded$/)).toBeTruthy();
 expect(screen.getAllByText('Pending · time not recorded')).toHaveLength(2);
});
