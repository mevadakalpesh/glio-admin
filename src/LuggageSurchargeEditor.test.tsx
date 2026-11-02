import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthContext } from "./useAuth";
import type { Auth } from "./authTypes";
import { LuggageSurchargeEditor } from "./LuggageSurchargeEditor";

import { api } from "./api";
vi.mock("./api", () => ({ api: vi.fn() }));
function setup(staffId='owner'){const auth: Auth = {
    session: {
      staff: {
        id: "owner",
        name: "Owner",
        email: "test@example.test",
        role: "owner",
        active: true,
        mfa_enabled: true,
        permissions: ["master-data.write"],
      },
      csrf_token: "csrf",
    },
    loading: false,
    unavailable: "",
    recovery: [],
    accept: vi.fn(),
    reload: vi.fn(),
    logout: vi.fn(),
    acknowledgeRecovery: vi.fn(),
  };



auth.session!.staff.id=staffId;const onChanged=vi.fn(),onClose=vi.fn();render(<AuthContext.Provider value={auth}><LuggageSurchargeEditor id={1} label="Bag" onChanged={onChanged} onClose={onClose}/></AuthContext.Provider>);return {onChanged};}
afterEach(()=>{cleanup();vi.resetAllMocks();});
const data={item:{revision:'revision',is_active:false,surcharge_percent:'5.00'},items:[],has_more:false};
const preview={preview_id:'preview',before:5,after:10,reason:'Review surcharge policy',expires_at:'2026-10-24T12:00:00Z',example:{base:100,before_total:105,after_total:110}};
const proposal={id:'proposal',actor_id:'owner',created_at:'2026-10-24T11:00:00Z',before:5,after:10,reason:'Review surcharge policy',state:'pending',reviewer_id:null,review_reason:null};
async function fill(){const user=userEvent.setup();await screen.findByText('No surcharge proposals recorded.');await user.type(screen.getByLabelText('New surcharge (%)'),'10');await user.type(screen.getByLabelText('Reason for surcharge change'),'Review surcharge policy');await user.click(screen.getByRole('button',{name:'Preview surcharge'}));return user;}
it('previews before submitting and does not offer proposer self-approval',async()=>{vi.mocked(api).mockResolvedValueOnce(data).mockResolvedValueOnce(preview).mockResolvedValueOnce({}).mockResolvedValue({...data,items:[proposal]});const {onChanged}=setup();const user=await fill();await user.click(await screen.findByRole('button',{name:'Submit for approval'}));await screen.findByRole('button',{name:'Withdraw proposal'});expect(screen.queryByRole('button',{name:'Approve surcharge'})).toBeNull();expect(onChanged).toHaveBeenCalledOnce();expect(api).toHaveBeenNthCalledWith(2,'/catalog/luggage/1/surcharge-preview',expect.objectContaining({body:{revision:'revision',surcharge_percent:10,reason:'Review surcharge policy'}}));});
it('a different owner reviews with a required reason',async()=>{vi.mocked(api).mockResolvedValue({...data,items:[proposal]});setup('reviewer');const user=userEvent.setup();await user.click(await screen.findByRole('button',{name:'Approve surcharge'}));expect(screen.queryByRole('button',{name:'Withdraw proposal'})).toBeNull();await user.type(screen.getByLabelText('Review reason'),'Independent pricing review');await user.click(screen.getByRole('button',{name:'Confirm decision'}));await waitFor(()=>expect(api).toHaveBeenCalledWith('/catalog/luggage/1/surcharge/proposal/decision',expect.objectContaining({body:{action:'approve',reason:'Independent pricing review'}})));});
it('active options cannot preview a surcharge change',async()=>{vi.mocked(api).mockResolvedValue({...data,item:{...data.item,is_active:true}});setup();await screen.findByText('No surcharge proposals recorded.');expect((screen.getByRole('button',{name:'Preview surcharge'}) as HTMLButtonElement).disabled).toBe(true);});
it('retries an uncertain proposal with the same operation reference',async()=>{vi.mocked(api).mockResolvedValueOnce(data).mockResolvedValueOnce(preview).mockRejectedValueOnce(Error('Connection interrupted')).mockResolvedValueOnce({}).mockResolvedValue(data);setup();const user=await fill();await user.click(await screen.findByRole('button',{name:'Submit for approval'}));await screen.findByRole('alert');await user.click(screen.getByRole('button',{name:'Retry same proposal'}));await screen.findByText('Proposal submitted. A different owner must review it.');expect(vi.mocked(api).mock.calls[2][1]?.body).toEqual(vi.mocked(api).mock.calls[3][1]?.body);});
