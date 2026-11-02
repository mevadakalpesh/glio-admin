import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthContext } from "./useAuth";
import type { Auth } from "./authTypes";
import { VehicleIconEditor } from "./VehicleIconEditor";

import { api } from "./api";
vi.mock("./api", () => ({ api: vi.fn() }));
function setup(allowed=true,kind:"vehicles"|"luggage"="vehicles"){const auth: Auth = {
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


if(!allowed)auth.session!.staff.permissions=[];const onSaved=vi.fn(),onClose=vi.fn();const view=render(<AuthContext.Provider value={auth}><VehicleIconEditor kind={kind} item={{id:1,label:'Car',revision:'revision'}} onSaved={onSaved} onClose={onClose}/></AuthContext.Provider>);return {...view,onSaved,onClose};}
afterEach(()=>{cleanup();vi.resetAllMocks();});
const preview={preview_id:'preview',data_url:'data:image/png;base64,aW1hZ2U=',expires_at:'2026-10-24T12:00:00Z',reason:'Replace catalog illustration'};
async function fill(){const user=userEvent.setup();await user.upload(screen.getByLabelText('Replacement image'),new File(['image'],'car.png',{type:'image/png'}));await screen.findByText('Selected: car.png');await user.type(screen.getByLabelText('Reason for icon change'),'Replace catalog illustration');await user.click(screen.getByRole('button',{name:'Preview icon'}));return user;}
it('does not read images without permission',()=>{setup(false);expect(api).not.toHaveBeenCalled();expect(screen.queryByRole('button')).toBeNull();});
it('shows server-normalized preview before explicit confirmation',async()=>{vi.mocked(api).mockResolvedValueOnce({data_url:null}).mockResolvedValueOnce(preview).mockResolvedValueOnce({});const {onSaved}=setup();const user=await fill();await screen.findByAltText('New Car icon');expect(onSaved).not.toHaveBeenCalled();await user.click(screen.getByRole('button',{name:'Confirm icon'}));await waitFor(()=>expect(onSaved).toHaveBeenCalledOnce());expect(api).toHaveBeenNthCalledWith(2,'/catalog/vehicles/1/icon-preview',expect.objectContaining({body:{revision:'revision',image_base64:'aW1hZ2U=',reason:'Replace catalog illustration'}}));});
it('allows replacement when current asset is missing and displays upload validation errors',async()=>{vi.mocked(api).mockRejectedValue(Error('Current icon cannot be read'));setup();await screen.findByText('Current icon cannot be read');await userEvent.setup().upload(screen.getByLabelText('Replacement image'),new File([new Uint8Array(384*1024+1)],'large.png',{type:'image/png'}));expect((await screen.findByRole('alert')).textContent).toContain('384 KB');expect((screen.getByRole('button',{name:'Preview icon'}) as HTMLButtonElement).disabled).toBe(true);});
it('reuses operation and image when retrying uncertain confirmation',async()=>{vi.mocked(api).mockResolvedValueOnce({data_url:null}).mockResolvedValueOnce(preview).mockRejectedValueOnce(Error('Interrupted')).mockResolvedValueOnce({});const {onSaved}=setup();const user=await fill();await user.click(await screen.findByRole('button',{name:'Confirm icon'}));await screen.findByRole('alert');expect((screen.getByRole('button',{name:'Back to edit'}) as HTMLButtonElement).disabled).toBe(true);await user.click(screen.getByRole('button',{name:'Retry same icon change'}));await waitFor(()=>expect(onSaved).toHaveBeenCalledOnce());expect(vi.mocked(api).mock.calls[2][1]?.body).toEqual(vi.mocked(api).mock.calls[3][1]?.body);});
it('aborts pending preview on unmount',async()=>{let resolve!:(v:unknown)=>void;vi.mocked(api).mockResolvedValueOnce({data_url:null}).mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));const {unmount,onSaved}=setup();await fill();const signal=vi.mocked(api).mock.calls[1][1]?.signal;unmount();expect(signal?.aborted).toBe(true);resolve(preview);expect(onSaved).not.toHaveBeenCalled();});

it('luggage editor shows the built-in fallback and uses luggage upload endpoints',async()=>{
 vi.mocked(api).mockResolvedValueOnce({data_url:null,fallback_icon:'🎒'}).mockResolvedValueOnce(preview).mockResolvedValueOnce({});const {onSaved}=setup(true,'luggage');
 await screen.findByText('Built-in icon: 🎒');const user=await fill();await user.click(await screen.findByRole('button',{name:'Confirm icon'}));await waitFor(()=>expect(onSaved).toHaveBeenCalledOnce());
 expect(api).toHaveBeenNthCalledWith(1,'/catalog/luggage/1/icon',expect.anything());expect(api).toHaveBeenNthCalledWith(2,'/catalog/luggage/1/icon-preview',expect.anything());expect(api).toHaveBeenLastCalledWith('/catalog/luggage/1/icon',expect.objectContaining({method:'POST'}));
});
