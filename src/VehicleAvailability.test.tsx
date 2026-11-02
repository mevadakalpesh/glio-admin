import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthContext } from "./useAuth";
import type { Auth } from "./authTypes";
import { VehicleAvailability } from "./VehicleAvailability";

import { api } from "./api";
vi.mock("./api", () => ({ api: vi.fn() }));
function setup(allowed=true,capacity=false) { const auth: Auth = {
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
const onSaved=vi.fn(),onClose=vi.fn();
const view=render(<AuthContext.Provider value={auth}><VehicleAvailability capacity={capacity} item={{id:1,label:capacity?"Car":"Bike",is_active:!capacity,revision:"revision",max_seats:4,capacity_limit:4}} onSaved={onSaved} onClose={onClose}/></AuthContext.Provider>);
return {...view,onSaved,onClose}; }
afterEach(()=>{cleanup();vi.resetAllMocks();});

const preview={preview_id:'preview',before:true,after:false,label:'Bike',reason:'Retire vehicle option',expires_at:'2026-10-24T12:00:00Z'};
async function fill(){const user=userEvent.setup();await user.selectOptions(screen.getByLabelText('Availability'),'inactive');await user.type(screen.getByLabelText('Reason for availability change'),'Retire vehicle option');await user.click(screen.getByRole('button',{name:'Review availability'}));return user;}
it('requires permission',()=>{setup(false);expect(screen.queryByRole('button')).toBeNull();expect(api).not.toHaveBeenCalled();});
it('previews before applying and returns success',async()=>{vi.mocked(api).mockResolvedValueOnce(preview).mockResolvedValueOnce({});const {onSaved}=setup();const user=await fill();await user.click(await screen.findByRole('button',{name:'Confirm availability'}));await waitFor(()=>expect(onSaved).toHaveBeenCalledOnce());expect(api).toHaveBeenNthCalledWith(1,'/catalog/vehicles/1/availability-preview',expect.objectContaining({body:{revision:'revision',is_active:false,reason:'Retire vehicle option'}}));});
it('shows open journey refusal without offering confirmation',async()=>{vi.mocked(api).mockRejectedValue(Error('Resolve open trips first'));setup();await fill();expect((await screen.findByRole('alert')).textContent).toContain('Resolve open trips');expect(screen.queryByRole('button',{name:'Confirm availability'})).toBeNull();});
it('reuses operation reference after uncertain response',async()=>{vi.mocked(api).mockResolvedValueOnce(preview).mockRejectedValueOnce(Error('Connection interrupted')).mockResolvedValueOnce({});const {onSaved}=setup();const user=await fill();await user.click(await screen.findByRole('button',{name:'Confirm availability'}));await screen.findByRole('alert');await user.click(screen.getByRole('button',{name:'Retry same change'}));await waitFor(()=>expect(onSaved).toHaveBeenCalledOnce());expect(vi.mocked(api).mock.calls[1][1]?.body).toEqual(vi.mocked(api).mock.calls[2][1]?.body);});
it('aborts and ignores a late preview after closing',async()=>{let resolve!:(v:unknown)=>void;vi.mocked(api).mockImplementation(()=>new Promise(r=>{resolve=r;}));const {unmount,onSaved}=setup();await fill();const signal=vi.mocked(api).mock.calls[0][1]?.signal;unmount();expect(signal?.aborted).toBe(true);resolve(preview);expect(onSaved).not.toHaveBeenCalled();});

it('previews numeric passenger capacity and confirms through the capacity endpoint',async()=>{
 vi.mocked(api).mockResolvedValueOnce({...preview,before:4,after:2}).mockResolvedValueOnce({});const {onSaved}=setup(true,true),user=userEvent.setup();
 await user.clear(screen.getByLabelText('Passenger seats'));await user.type(screen.getByLabelText('Passenger seats'),'2');await user.type(screen.getByLabelText('Reason for capacity change'),'Review passenger seating');await user.click(screen.getByRole('button',{name:'Review capacity'}));
 await screen.findByText('4 seats → 2 seats');expect(api).toHaveBeenCalledWith('/catalog/vehicles/1/capacity-preview',expect.objectContaining({body:{revision:'revision',max_seats:2,reason:'Review passenger seating'}}));
 await user.click(screen.getByRole('button',{name:'Confirm capacity'}));await waitFor(()=>expect(onSaved).toHaveBeenCalledOnce());expect(api).toHaveBeenLastCalledWith('/catalog/vehicles/1/capacity',expect.objectContaining({body:{preview_id:'preview',operation_id:expect.any(String)}}));
});
it('capacity form uses the supported ceiling and does not offer an availability switch',()=>{setup(true,true);expect(screen.queryByLabelText('Availability')).toBeNull();expect((screen.getByLabelText('Passenger seats') as HTMLInputElement).max).toBe('4');expect((screen.getByRole('button',{name:'Review capacity'}) as HTMLButtonElement).disabled).toBe(true);});
