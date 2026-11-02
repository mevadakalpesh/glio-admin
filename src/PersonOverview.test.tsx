import userEvent from '@testing-library/user-event';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {PersonOverview} from './PersonOverview';
const access=vi.hoisted(()=>({permissions:[] as string[],role:'owner'}));
vi.mock('./useAuth',()=>({useAuth:()=>({session:{staff:access}})}));
vi.mock('./Verification',()=>({Verification:({personId,category}:{personId:string;category:string})=><div>Evidence {personId} {category}</div>}));
vi.mock('./PersonContact',()=>({PersonContact:()=> <div>Protected contact form</div>}));
vi.mock('./PersonRestriction',()=>({PersonRestriction:()=> <div>Access impact form</div>}));
const detail={person:{id:'customer',name:'Test Customer',phone_masked:'••••••1234',email_masked:'t•••@•••',role:'both',account_status:'active',is_active:true,new_journeys_restricted:true,created_at:'2026-10-31T04:00:00Z',updated_at:'2026-10-31T04:30:00Z'},journeys:{trips:7,rides:12},generated_at:'2026-10-31T05:00:00Z'};
afterEach(cleanup);
function show(){const refresh=vi.fn();render(<MemoryRouter><PersonOverview detail={detail} onRefresh={refresh}/></MemoryRouter>);return refresh;}
it('uses API totals and hides protected actions without permissions',()=>{access.permissions=[];show();expect(screen.getByText('7')).toBeTruthy();expect(screen.getByText('12')).toBeTruthy();expect(screen.getByText('Restricted')).toBeTruthy();expect(screen.getByText('••••••1234')).toBeTruthy();expect(screen.queryByRole('button',{name:'Contact details'})).toBeNull();expect(screen.queryByRole('button',{name:'Manage access'})).toBeNull();expect(screen.queryByRole('link')).toBeNull();});
it('links journeys and evidence to this account and opens forms only in dialogs',async()=>{access.permissions=['journeys.read','verification.read','audit.read','people.contact.read','people.restrict'];const refresh=show();expect(screen.getByRole('link',{name:'View rides'}).getAttribute('href')).toBe('/trips?kind=rides&person=customer');expect(screen.getByRole('link',{name:/Document verification/}).getAttribute('href')).toBe('/verification?person=customer');expect(screen.queryByText('Protected contact form')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Contact details'}));expect(await screen.findByRole('dialog')).toBeTruthy();expect(screen.getByText('Protected contact form')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Close dialog'}));await vi.waitFor(()=>expect(screen.queryByText('Protected contact form')).toBeNull());fireEvent.click(screen.getByRole('button',{name:'Manage access'}));expect(await screen.findByText('Access impact form')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Close dialog'}));expect(refresh).toHaveBeenCalledOnce();});
it('shows the saved avatar and falls back to initials if loading fails',()=>{
 access.permissions=[];
 const record={...detail,person:{...detail.person,avatar_url:'/api/admin/v1/people/customer/avatar'}};
 const {container}=render(<MemoryRouter><PersonOverview detail={record} onRefresh={vi.fn()}/></MemoryRouter>);
 const image=container.querySelector('img')!;
 expect(image.getAttribute('src')).toBe(record.person.avatar_url);
 fireEvent.error(image);
 expect(container.querySelector('img')).toBeNull();
 expect(screen.getByText('TC')).toBeTruthy();
});

it('switches account sections without duplicate verification headings',()=>{
 access.permissions=['verification.read'];access.role='owner';show();
 expect(screen.queryByText(/Evidence customer/)).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Identity documents'}));
 expect(screen.getByText('Evidence customer documents')).toBeTruthy();
 expect(screen.queryByText('Account record')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Selfies'}));
 expect(screen.getByText('Evidence customer selfies')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Account info'}));
 expect(screen.getByText('Account record')).toBeTruthy();
 expect(screen.queryByText('Documents & verification')).toBeNull();
});
it('keeps identity and selfie tabs hidden from regional staff',()=>{
 access.permissions=['verification.read'];access.role='verification';show();
 expect(screen.queryByRole('button',{name:'Identity documents'})).toBeNull();
 expect(screen.queryByRole('button',{name:'Selfies'})).toBeNull();
 expect(screen.getByRole('button',{name:'Vehicle & licence'})).toBeTruthy();
 access.role='owner';
});
it('exposes restoration and journey operations in the account actions tab',()=>{
 access.permissions=['people.restrict','journeys.read','audit.read'];show();
 fireEvent.click(screen.getByRole('button',{name:'Account actions'}));
 expect(screen.getByText('New journeys suspended')).toBeTruthy();
 expect(screen.getByRole('button',{name:'Restore new-journey access'})).toBeTruthy();
 expect(screen.getByText('Journey operations')).toBeTruthy();
 expect(screen.getByText('View audit history')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Restore new-journey access'}));
 expect(screen.getByText('Access impact form')).toBeTruthy();
});
it('shows a shadcn tooltip for header actions on keyboard focus',async()=>{
 access.permissions=['people.contact.read'];show();
 const button=screen.getByRole('button',{name:'Contact details'});
 await userEvent.setup().tab();
 expect(await screen.findByText('Open protected customer contact information.')).toBeTruthy();
 fireEvent.click(button);
 expect(await screen.findByText('Protected contact form')).toBeTruthy();
});
