import {addFilter} from "./filterTestHelpers";
import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Cases } from "./Cases";
import { api } from "./api";
const access = vi.hoisted(() => ({ allowed: true, exit: false }));
vi.mock("./useAuth", () => ({
  useAuth: () => ({
    session: { staff: { permissions: access.allowed ? ["cases.read", ...(access.exit?["cases.exit.manage"]:[])] : [] } },
  }),
}));
vi.mock("./api", () => ({ api: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  access.allowed = true;
  access.exit = false;
});
const result = {
  items: [
    {
      id: "case",
      ride_request_id: "ride",
      trip_id: "trip",
      ride_reference: "R0002",
      trip_reference: "T0003",
      kind: "safety",
      status: "unknown_future",
      created_at: "2026-10-18T00:00:00Z",
      resolved_at: null,
      passenger_exit_confirmed_at: null,
    },
  ],
  page: 1,
  total: 1,
  page_size: 25,
  generated_at: "2026-10-18T00:00:00Z",
};
function mount() {
  render(
    <MemoryRouter>
      <Cases />
    </MemoryRouter>,
  );
}
it("shows safe case summaries with journey links and unknown states", async () => {
  vi.mocked(api).mockResolvedValue(result);
  mount();
  expect((await screen.findByText("R0002")).getAttribute("href")).toBe(
    "/trips?kind=rides&id=ride",
  );
  expect(screen.getByText("unknown future")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /resolve/i })).toBeNull();
});
it("filters and refreshes the queue without write requests", async () => {
  vi.mocked(api).mockResolvedValue(result);
  mount();
  await screen.findByText("R0002");
  const user = userEvent.setup();
  await addFilter('Status'); await user.selectOptions(screen.getByLabelText("Status"), "waiting");
  await waitFor(() =>
    expect(api).toHaveBeenLastCalledWith(
      "/ride-cases?status=waiting",
      expect.anything(),
    ),
  );
  await user.click(screen.getByRole("button", { name: "Refresh cases" }));
  await waitFor(() => expect(api).toHaveBeenCalledTimes(3));
});
it("renders empty and failure states without fabricated records", async () => {
  vi.mocked(api)
    .mockResolvedValueOnce({ ...result, items: [], total: 0 })
    .mockRejectedValueOnce(Error("Unavailable"));
  mount();
  await screen.findByText("No cases match these filters.");
  await userEvent.click(screen.getByRole("button", { name: "Refresh cases" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Unavailable");
});
it("does not fetch cases without permission", () => {
  access.allowed = false;
  mount();
  expect(api).not.toHaveBeenCalled();
  expect(screen.getByText(/do not have access/)).toBeTruthy();
});

const detail = {
  item: {
    id: "case",
    ride_request_id: "ride",
    trip_id: "trip",
    kind: "safety",
    status: "open",
    created_at: null,
    updated_at: null,
    resolved_at: null,
    passenger_exit_confirmed_at: null,
  },
  activity: { items: [], page: 1, total: 0, page_size: 25 },
  generated_at: "2026-10-18T00:00:00Z",
};
it("opens case details and preserves queue filters when returning", async () => {
  vi.mocked(api).mockImplementation(async (path) => {
    if (path.endsWith("/assignment")) return { version: 0, assigned: false, assigned_to_me: false, can_claim: true };
    return path.includes("activity_page") ? detail : result;
  });
  render(
    <MemoryRouter initialEntries={["/support?status=open"]}>
      <Cases />
    </MemoryRouter>,
  );
  await userEvent.click(await screen.findByText("Inspect case"));
  await screen.findByText("Ride case details");
  await screen.findByText("No recorded ride activity.");
  expect(screen.getByText("Back to cases").getAttribute("href")).toBe(
    "/support?status=open",
  );
  expect(api).toHaveBeenCalledWith(
    "/ride-cases/case?activity_page=1",
    expect.anything(),
  );
  await userEvent.click(screen.getByText("Back to cases"));
  await screen.findByText("R0002");
});
it("detail paginates whole-ride activity and handles missing cases", async () => {
  vi.mocked(api).mockImplementation(async (path) => {
    if (path.endsWith("/assignment")) return { version: 0, assigned: false, assigned_to_me: false, can_claim: true };
    if (path.endsWith("activity_page=2")) throw Error("Ride case not found.");
    return { ...detail, activity: { ...detail.activity, total: 26 } };
  });
  render(
    <MemoryRouter initialEntries={["/support?case=case"]}>
      <Cases />
    </MemoryRouter>,
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Next activity" }),
  );
  expect((await screen.findByRole("alert")).textContent).toBe(
    "Ride case not found.",
  );
  expect(api).toHaveBeenLastCalledWith(
    "/ride-cases/case?activity_page=2",
    expect.anything(),
  );
});

it("filters assignments, resets pagination and preserves filters through case navigation", async () => {
  vi.mocked(api).mockImplementation(async (path) => {
    if (path.endsWith("/assignment")) return { version: 0, assigned: false, assigned_to_me: false, can_claim: true };
    return path.includes("activity_page") ? detail : { ...result, items: [{ ...result.items[0], assignment: "mine" }] };
  });
  render(<MemoryRouter initialEntries={["/support?status=open&page=3"]}><Cases /></MemoryRouter>);
  await screen.findByText("Assigned to you");
  await addFilter('Assignment'); await userEvent.selectOptions(screen.getByLabelText("Assignment"), "mine");
  await waitFor(() => expect(api).toHaveBeenLastCalledWith("/ride-cases?status=open&assignment=mine", expect.anything()));
  await userEvent.click(screen.getByText("Inspect case"));
  await screen.findByText("Ride case details");
  expect(screen.getByText("Back to cases").getAttribute("href")).toBe("/support?status=open&assignment=mine");
  await userEvent.click(screen.getByText("Back to cases"));
  await screen.findByText("Assigned to you");
  expect(screen.getByRole("combobox", {name:"Assignment"})).toHaveProperty("value", "mine");
});

it('keeps trip context through case inspection and additional filters',async()=>{
 vi.mocked(api).mockResolvedValue(result);
 render(<MemoryRouter initialEntries={['/support?trip_reference=T0003']}><Cases/></MemoryRouter>);
 await screen.findByText('R0002');
 expect(api).toHaveBeenLastCalledWith('/ride-cases?trip_reference=T0003',expect.anything());
 expect(screen.getByText('Inspect case').getAttribute('href')).toBe('/support?trip_reference=T0003&case=case');
 await addFilter('Status'); await userEvent.selectOptions(screen.getByLabelText('Status'),'waiting');
 await waitFor(()=>expect(api).toHaveBeenLastCalledWith('/ride-cases?status=waiting&trip_reference=T0003',expect.anything()));
 await userEvent.click(screen.getByRole('button',{name:'Remove Trip reference filter'}));
 await waitFor(()=>expect(api).toHaveBeenLastCalledWith('/ride-cases?status=waiting',expect.anything()));
});
it('normalizes entered references and combines trip and ride search',async()=>{
 vi.mocked(api).mockResolvedValue(result);mount();await screen.findByText('R0002');
 await addFilter('Trip reference'); await userEvent.type(screen.getByLabelText('Trip reference'),'t0003');await addFilter('Ride reference'); await userEvent.type(screen.getByLabelText('Ride reference'),'r0002');

 await waitFor(()=>expect(api).toHaveBeenLastCalledWith('/ride-cases?trip_reference=T0003&ride_reference=R0002',expect.anything()));
});

it('offers exit review only to permitted staff and preserves the filter through inspection',async()=>{
 vi.mocked(api).mockResolvedValue(result);mount();await screen.findByText('R0002');expect(screen.queryByLabelText('Exit review')).toBeNull();cleanup();
 access.exit=true;render(<MemoryRouter initialEntries={['/support?status=open&page=3']}><Cases/></MemoryRouter>);await screen.findByText('R0002');
 await addFilter('Exit review'); await userEvent.selectOptions(screen.getByLabelText('Exit review'),'independent');
 await waitFor(()=>expect(api).toHaveBeenLastCalledWith('/ride-cases?status=open&exit_review=independent',expect.anything()));
 expect(screen.getByText('Inspect case').getAttribute('href')).toBe('/support?status=open&exit_review=independent&case=case');
 expect(screen.getByText(/does not establish approval eligibility/)).toBeTruthy();
 await addFilter('Exit review'); await userEvent.selectOptions(screen.getByLabelText('Exit review'),'');
 await waitFor(()=>expect(api).toHaveBeenLastCalledWith('/ride-cases?status=open',expect.anything()));
});
it('filters overdue follow-ups and resets the queue page',async()=>{
 vi.mocked(api).mockResolvedValue(result);render(<MemoryRouter initialEntries={['/support?page=3&status=open']}><Cases/></MemoryRouter>);await screen.findByText('R0002');await addFilter('Follow-up'); await userEvent.selectOptions(screen.getByLabelText('Follow-up'),'overdue');await waitFor(()=>expect(api).toHaveBeenLastCalledWith('/ride-cases?status=open&followup=overdue',expect.anything()));
});

it('keeps case actions available when optional columns are hidden',async()=>{
 vi.mocked(api).mockResolvedValue(result);mount();await screen.findByText('R0002');
 await userEvent.click(screen.getByRole('button',{name:'Columns'}));
 await userEvent.click(await screen.findByRole('checkbox',{name:'Assignment'}));
 expect(screen.queryByRole('columnheader',{name:'Assignment'})).toBeNull();
 await userEvent.keyboard('{Escape}');
 await userEvent.click(screen.getByRole('button',{name:'Actions for R0002'}));
 expect((await screen.findByRole('menuitem',{name:'Open case'})).getAttribute('href')).toBe('/support?case=case');
 expect(screen.queryByRole('menuitem',{name:'View trip'})).toBeNull();
});
it('clears unsubmitted journey text even when the URL has no filters',async()=>{
 vi.mocked(api).mockResolvedValue(result);mount();await screen.findByText('R0002');
 await addFilter('Trip reference'); await userEvent.type(screen.getByLabelText('Trip reference'),'T0013');
 await userEvent.click(screen.getByRole('button',{name:'Clear all filters'}));
 expect(screen.queryByLabelText('Trip reference')).toBeNull();
});
