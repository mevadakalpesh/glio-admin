import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthContext } from "./useAuth";
import type { Auth } from "./authTypes";
import { LuggageCreator } from "./LuggageCreator";
import { LuggageHistory } from "./LuggageHistory";
import { api } from "./api";
vi.mock("./api", () => ({ api: vi.fn() }));
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
const view=render(<AuthContext.Provider value={auth}><LuggageCreator onCreated={onCreated} onClose={onClose}/></AuthContext.Provider>);
return {...view,onCreated,onClose}; }
afterEach(()=>{cleanup();vi.resetAllMocks();});
const values={key:'overnight_bag',label:'Overnight bag',description:'One overnight bag',icon:'backpack',surcharge_percent:0,sort_order:0,reason:'Add an overnight bag option'};
const preview={preview_id:'preview-id',values,is_active:false,expires_at:'2026-10-24T10:00:00Z',example:{base_amount:100,surcharge_amount:0,total_before_other_adjustments:100}};
async function fill(){const user=userEvent.setup();
for(const [label,value] of [['Permanent key',values.key],['Customer label',values.label],['Customer description',values.description],['Creation reason',values.reason]])await user.type(screen.getByLabelText(label),value);
await user.click(screen.getByRole('button',{name:'Preview new luggage option'}));return user;}
it('requires write permission',()=>{setup(false);expect(screen.queryByRole('button')).toBeNull();expect(api).not.toHaveBeenCalled();});
it('previews normalized zero surcharge and creates only with preview and operation identity',async()=>{
vi.mocked(api).mockResolvedValueOnce(preview).mockResolvedValueOnce({item:{id:7}});const {onCreated}=setup();const user=await fill();
await screen.findByRole('button',{name:'Create inactive luggage option'});
expect(api).toHaveBeenCalledWith('/catalog/luggage/create-preview',expect.objectContaining({body:values,csrf:'csrf'}));
await user.click(screen.getByRole('button',{name:'Create inactive luggage option'}));await waitFor(()=>expect(onCreated).toHaveBeenCalledWith(7));
expect(api).toHaveBeenLastCalledWith('/catalog/luggage/create',expect.objectContaining({body:{preview_id:'preview-id',operation_id:expect.any(String)}}));});
it('retries an uncertain result using the same operation identity',async()=>{
vi.mocked(api).mockResolvedValueOnce(preview).mockRejectedValueOnce(Error('Connection interrupted')).mockResolvedValueOnce({item:{id:8}});
const {onCreated}=setup();const user=await fill();await user.click(await screen.findByRole('button',{name:'Create inactive luggage option'}));await screen.findByRole('alert');
expect((screen.getByRole('button',{name:'Back to edit'}) as HTMLButtonElement).disabled).toBe(true);
const first=vi.mocked(api).mock.calls[1][1];await user.click(screen.getByRole('button',{name:'Retry same creation'}));await waitFor(()=>expect(onCreated).toHaveBeenCalledWith(8));expect(vi.mocked(api).mock.calls[2][1]?.body).toEqual(first?.body);});
it('aborts pending preview on unmount',async()=>{let resolve!:(value:unknown)=>void;vi.mocked(api).mockImplementation(()=>new Promise(r=>{resolve=r;}));const {unmount,onCreated}=setup();await fill();const signal=vi.mocked(api).mock.calls[0][1]?.signal;unmount();expect(signal?.aborted).toBe(true);resolve(preview);expect(onCreated).not.toHaveBeenCalled();});
it('shows empty history without inventing a creation event',async()=>{vi.mocked(api).mockResolvedValue({items:[],has_more:false});render(<LuggageHistory id={4} onClose={vi.fn()}/>);await screen.findByText(/Seeded or older records/);expect(api).toHaveBeenCalledWith('/catalog/luggage/4/history?page=1',expect.anything());});
it('paginates history and displays reason and inactive state',async()=>{
vi.mocked(api).mockResolvedValueOnce({items:[{id:'event',action:'catalog.luggage_created',actor_id:'owner',created_at:'2026-10-24T10:00:00Z',reason:'Initial catalog onboarding',before:null,after:{is_active:false}}],has_more:true}).mockResolvedValueOnce({items:[],has_more:false});
render(<LuggageHistory id={4} onClose={vi.fn()}/>);await screen.findByText('Initial catalog onboarding');expect(screen.getByText('Inactive')).toBeTruthy();await userEvent.setup().click(screen.getByRole('button',{name:'Next history'}));await waitFor(()=>expect(api).toHaveBeenLastCalledWith('/catalog/luggage/4/history?page=2',expect.anything()));});
