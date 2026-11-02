import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthContext } from "./useAuth";
import type { Auth } from "./authTypes";
import { VehicleCreator } from "./VehicleCreator";

import { api } from "./api";
vi.mock("./api", async importOriginal => ({...await importOriginal<typeof import("./api")>(), api: vi.fn()}));
vi.mock("./useRead",()=>({useRead:()=>({data:{items:[{key:"car",max_seats:4},{key:"bike",max_seats:1}]}})}));
function setup(allowed=true) { const auth: Auth = {
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

if (!allowed) auth.session!.staff.permissions=[];
const onCreated=vi.fn(),onClose=vi.fn();
const view=render(<AuthContext.Provider value={auth}><VehicleCreator onCreated={onCreated} onClose={onClose}/></AuthContext.Provider>);
return {...view,onCreated,onClose}; }
afterEach(()=>{cleanup();vi.resetAllMocks();});
const values={key:'hatchback',label:'Hatchback',profile_key:'car',max_seats:4,sort_order:0,reason:'Add a passenger vehicle option'};
const preview={preview_id:'preview-id',values,is_active:false,expires_at:'2026-10-24T10:00:00Z',example:{base_amount:100,surcharge_amount:0,total_before_other_adjustments:100}};
async function fill(){const user=userEvent.setup();
for(const [label,value] of [['Permanent key',values.key],['Customer label',values.label],['Creation reason',values.reason]])await user.type(screen.getByLabelText(label),value);
await user.click(screen.getByRole('button',{name:'Preview new vehicle type'}));return user;}
it('requires write permission',()=>{setup(false);expect(screen.queryByRole('button')).toBeNull();expect(api).not.toHaveBeenCalled();});
it('previews passenger capacity and creates only with preview and operation identity',async()=>{
vi.mocked(api).mockResolvedValueOnce(preview).mockResolvedValueOnce({item:{id:7}});const {onCreated}=setup();const user=await fill();
await screen.findByRole('button',{name:'Create inactive vehicle type'});
expect(api).toHaveBeenCalledWith('/catalog/vehicles/create-preview',expect.objectContaining({body:values,csrf:'csrf'}));
await user.click(screen.getByRole('button',{name:'Create inactive vehicle type'}));await waitFor(()=>expect(onCreated).toHaveBeenCalledWith(7));
expect(api).toHaveBeenLastCalledWith('/catalog/vehicles/create',expect.objectContaining({body:{preview_id:'preview-id',operation_id:expect.any(String)}}));});
it('retries an uncertain result using the same operation identity',async()=>{
vi.mocked(api).mockResolvedValueOnce(preview).mockRejectedValueOnce(Error('Connection interrupted')).mockResolvedValueOnce({item:{id:8}});
const {onCreated}=setup();const user=await fill();await user.click(await screen.findByRole('button',{name:'Create inactive vehicle type'}));await screen.findByRole('alert');
expect((screen.getByRole('button',{name:'Back to edit'}) as HTMLButtonElement).disabled).toBe(true);
const first=vi.mocked(api).mock.calls[1][1];await user.click(screen.getByRole('button',{name:'Retry same creation'}));await waitFor(()=>expect(onCreated).toHaveBeenCalledWith(8));expect(vi.mocked(api).mock.calls[2][1]?.body).toEqual(first?.body);});
it('aborts pending preview on unmount',async()=>{let resolve!:(value:unknown)=>void;vi.mocked(api).mockImplementation(()=>new Promise(r=>{resolve=r;}));const {unmount,onCreated}=setup();await fill();const signal=vi.mocked(api).mock.calls[0][1]?.signal;unmount();expect(signal?.aborted).toBe(true);resolve(preview);expect(onCreated).not.toHaveBeenCalled();});
