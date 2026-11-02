import {addFilter} from "./filterTestHelpers";
import { afterEach, it, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "./useAuth";
import type { Auth } from "./authTypes";
import { Journeys } from "./Journeys";
const auth = (allowed = true): Auth => ({
  session: {
    staff: {
      id: "staff",
      name: "Owner",
      email: "test@example.test",
      role: allowed ? "owner" : "support",
      active: true,
      mfa_enabled: true,
      permissions: allowed ? ["journeys.read"] : [],
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
});
const response = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data }), {
    headers: { "Content-Type": "application/json" },
  });
const row = {
  id: "11111111-1111-4111-8111-111111111111",
  reference: "T0002",
  status_label: "COMPLETED",
  origin: { city: "Dhrangadhra", state: "Gujarat" },
  destination: { city: "Halvad", state: "Gujarat" },
  departure_at: "2026-10-18T04:30:00Z",
  created_at: "2026-10-18T03:30:00Z",
  updated_at: "2026-10-18T06:30:00Z",
};
const list = {
  items: [row],
  total: 1,
  page: 1,
  statuses: [{ value: "8", label: "COMPLETED" }],
  date_filter: "Scheduled departure (IST)",
};
function setup(allowed = true, url = "/trips") {
  return render(
    <AuthContext.Provider value={auth(allowed)}>
      <MemoryRouter initialEntries={[url]}>
        <Journeys />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("does not request journeys for unauthorized roles", () => {
  vi.stubGlobal("fetch", vi.fn());
  setup(false);
  expect(screen.getByText(/does not include journey inspection/)).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
});
it("opens recorded details and preserves filters when returning to list", async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(response(list))
      .mockResolvedValueOnce(
        response({
          journey: row,
          history: {
            items: [
              {
                id: "event",
                action: "trip_completed",
                created_at: "2026-10-18T06:30:00Z",
                from_status: null,
                to_status: null,
              },
            ],
            total: 1,
            page: 1,
          },
        }),
      )
      .mockResolvedValueOnce(response(list)),
  );
  setup(true, "/trips?reference=T0002");
  await user.click(await screen.findByRole("button", { name: "Actions for T0002" }));
  await user.click(await screen.findByRole("menuitem", {name:"View T0002"}));
  expect(await screen.findByText(/Exact addresses, contact details/)).toBeTruthy();
  await user.click(screen.getByRole("button", {name: "Activity"}));
  expect(await screen.findByText("Activity history")).toBeTruthy();
  expect(screen.getByText("Trip completed")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Back to trips" }));
  await screen.findByRole("button", { name: "Actions for T0002" });
  expect((screen.getByLabelText("Reference") as HTMLInputElement).value).toBe(
    "T0002",
  );
  expect(
    vi
      .mocked(fetch)
      .mock.calls.every(([, options]) => options?.method === "GET"),
  ).toBe(true);
});
it("sends date and status filters to the backend and shows an honest empty state", async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(response(list))
      .mockImplementation(() => Promise.resolve(response({ ...list, items: [], total: 0 }))),
  );
  setup();
  await screen.findByRole("button", { name: "Actions for T0002" });
  await addFilter("Status");
  await user.selectOptions(screen.getByLabelText("Status"), "8");
  const clock=vi.spyOn(Date,'now').mockReturnValue(Date.parse('2026-10-18T06:00:00Z'));
  await user.click(screen.getByRole('button',{name:'Scheduled dates'}));
  await user.click(screen.getByRole('button',{name:'Today'}));
  clock.mockRestore();
  await waitFor(()=>expect(String(vi.mocked(fetch).mock.calls.at(-1)?.[0])).toContain('from=2026-10-18'));

  expect(await screen.findByText("No journeys found")).toBeTruthy();
  expect(String(vi.mocked(fetch).mock.calls.at(-1)?.[0])).toContain("status=8");
  expect(String(vi.mocked(fetch).mock.calls.at(-1)?.[0])).toContain(
    "from=2026-10-18",
  );
});
it("keeps overview state scope on journey requests and allows clearing the narrowing filter",async()=>{
 vi.stubGlobal("fetch",vi.fn().mockImplementation(async()=>response(list)));
 setup(true,"/trips?kind=trips&from=2026-10-20&state=GJ");
 await screen.findByText("T0002");
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("state=GJ");
 await userEvent.click(screen.getByText("Clear state filter"));
 await screen.findByText("T0002");
 expect(String(vi.mocked(fetch).mock.calls.at(-1)![0])).not.toContain("state=");
 expect(String(vi.mocked(fetch).mock.calls.at(-1)![0])).toContain("from=2026-10-20");
});
it.each([true,false])('historical inspection entry respects evidence permission: %s',async(allowed)=>{
 vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>response({journey:row,history:{items:[],total:0,page:1}})));
 const access=auth();if(allowed)access.session!.staff.permissions.push('tracking.evidence.read');
 render(<AuthContext.Provider value={access}><MemoryRouter initialEntries={[`/trips?kind=trips&id=${row.id}`]}><Journeys/></MemoryRouter></AuthContext.Provider>);
 await screen.findByText('T0002');
 const button=screen.queryByText('Inspect recorded trip locations');
 if(!allowed){expect(button).toBeNull();return;}
 expect(button).toBeTruthy();await userEvent.click(button!);
 expect(screen.getByRole('group', {name:'From date and time (IST)'})).toBeTruthy();
 expect(fetch).toHaveBeenCalledTimes(1);
 await userEvent.click(screen.getByText('Close inspection'));
 expect(screen.queryByLabelText('Inspection reason')).toBeNull();
});

it.each(['trips','rides'])('links %s details to scoped case search only with case access',async(kind)=>{
 const reference=kind==='trips'?'T0002':'R0002';
 vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>response({journey:{...row,reference},history:{items:[],total:0,page:1}})));
 const access=auth();access.session!.staff.permissions.push('cases.read');
 render(<AuthContext.Provider value={access}><MemoryRouter initialEntries={[`/trips?kind=${kind}&id=${row.id}`]}><Journeys/></MemoryRouter></AuthContext.Provider>);
 expect((await screen.findByText(kind==='trips'?'Support & issues':'Review journey cases')).getAttribute('href')).toBe(`/support?${kind==='trips'?'trip_reference':'ride_reference'}=${reference}`);
});
it('sorts the full result set through the API and resets pagination',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>response(list)));
 setup();
 await screen.findByRole('button',{name:'Actions for T0002'});
 await userEvent.click(screen.getByRole('button',{name:'Sort by Reference'}));
 await screen.findByRole('button',{name:'Actions for T0002'});
 expect(String(vi.mocked(fetch).mock.calls.at(-1)![0])).toContain('sort=reference');
 expect(String(vi.mocked(fetch).mock.calls.at(-1)![0])).toContain('direction=asc');
 await userEvent.click(screen.getByRole('button',{name:'Sort by Reference'}));
 await screen.findByRole('button',{name:'Actions for T0002'});
 expect(String(vi.mocked(fetch).mock.calls.at(-1)![0])).toContain('direction=desc');
});
