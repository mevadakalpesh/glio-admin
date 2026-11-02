import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { OperationsOverview, People } from "./Inspection";
import { AuthContext } from "./useAuth";
import type { Auth } from "./authTypes";
const auth = (allowed = true): Auth => ({
  session: {
    staff: {
      id: "owner",
      name: "Owner",
      email: "test@example.test",
      role: allowed ? "owner" : "support",
      active: true,
      mfa_enabled: true,
      permissions: allowed ? ["overview.read", "people.read", "journeys.read"] : [],
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
const response = (data: unknown, status = 200) =>
  new Response(
    JSON.stringify(
      status === 200
        ? { success: true, data }
        : { success: false, message: data },
    ),
    { status, headers: { "Content-Type": "application/json" } },
  );
function setup(view: "overview" | "people", allowed = true, url = "/") {
  return render(
    <AuthContext.Provider value={auth(allowed)}>
      <MemoryRouter initialEntries={[url]}>
        {view === "overview" ? <OperationsOverview /> : <People />}
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it.each(["overview", "people"] as const)(
  "denies %s without fetching customer data",
  (view) => {
    vi.stubGlobal("fetch", vi.fn());
    setup(view, false);
    expect(screen.getByText(/does not include this view/)).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  },
);
it("overview shows recorded status counts and links to the matching filter", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        response({
          trips: [{ status: 8, label: "COMPLETED", count: 3 }],
          rides: [{ status: 3, label: "PAYMENT PENDING", count: 2 }],
          generated_at: "2026-10-18T04:30:00Z",
          scope: "All dates",
        }),
      ),
  );
  setup("overview");
  expect(
    (await screen.findByRole("link", { name: /Completed/ })).getAttribute(
      "href",
    ),
  ).toBe("/trips?kind=trips&status=8");
  for (const link of screen.getAllByRole("link", {name:/Payment pending/}))
    expect(link.getAttribute("href")).toBe("/trips?kind=rides&status=3");
  expect(screen.getByText(/not live GPS activity/)).toBeTruthy();
  expect(fetch).toHaveBeenCalledTimes(1); // Reports are not requested without reports.read.
});
it("overview API errors do not show fabricated zero totals", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(response("Snapshot unavailable", 503)),
  );
  setup("overview");
  expect((await screen.findByRole("alert")).textContent).toBe(
    "Snapshot unavailable",
  );
  expect(screen.queryByText("0")).toBeNull();
  expect(screen.queryByText("No trips recorded.")).toBeNull();
});
it("people details show masked contacts and participant-scoped links, then preserve search on return", async () => {
  const user = userEvent.setup();
  const person = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Kalpesh Test",
    phone_masked: "••••••3210",
    email_masked: "k•••@•••",
    role: "both",
    is_active: true,
    account_status: "active",
    created_at: "2026-10-18T04:30:00Z",
    updated_at: "2026-10-18T04:30:00Z",
  };
  const list = { items: [person], total: 1, page: 1 };
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(response(list))
      .mockResolvedValueOnce(
        response({
          person,
          journeys: { trips: 2, rides: 3 },
          generated_at: "2026-10-18T04:30:00Z",
        }),
      )
      .mockResolvedValueOnce(response(list)),
  );
  setup("people", true, "/people?search=Kalpesh");
  await user.click(
    await screen.findByRole("button", { name: "Actions for Kalpesh Test" }),
  );
  await user.click(await screen.findByRole("menuitem",{name:"View account"}));
  expect(await screen.findByText(/does not establish identity/)).toBeTruthy();
  expect(screen.getByText("••••••3210")).toBeTruthy();
  expect(
    screen.getByRole("link", { name: /View rides/ }).getAttribute("href"),
  ).toBe("/trips?kind=rides&person=" + person.id);
  await user.click(screen.getByRole("button", { name: "Back to people" }));
  await screen.findByRole("button", { name: "Actions for Kalpesh Test" });
  expect(
    (screen.getByLabelText("Name or account ID") as HTMLInputElement).value,
  ).toBe("Kalpesh");
  expect(
    vi
      .mocked(fetch)
      .mock.calls.every(([, options]) => options?.method === "GET"),
  ).toBe(true);
});

it("labels analyst totals with their regional scope and replaces snapshots after scope changes", async () => {
  const session = auth();
  session.session!.staff.role = "analyst";
  session.session!.staff.permissions = ["overview.read", "journeys.read"];
  session.session!.staff.assigned_states = ["GJ"];
  const request = vi.fn().mockResolvedValueOnce(response({
    trips: [{status:8,label:"COMPLETED",count:3}], rides: [],
    generated_at: "2026-10-18T04:30:00Z", scope: "Assigned states · both endpoints",
  })).mockImplementationOnce(() => new Promise(() => {}));
  vi.stubGlobal("fetch",request);
  const view = (value: Auth) => <AuthContext.Provider value={value}><MemoryRouter><OperationsOverview /></MemoryRouter></AuthContext.Provider>;
  const mounted = render(view(session));
  expect(await screen.findByText(/Assigned states · both endpoints/)).toBeTruthy();
  const updated = {...session, session:{...session.session!,staff:{...session.session!.staff,assigned_states:["MH"]}}};
  mounted.rerender(view(updated));
  expect(screen.queryByText(/Assigned states · both endpoints/)).toBeNull();
  expect(screen.getByText("Loading overview…")).toBeTruthy();
  expect(request).toHaveBeenCalledTimes(2);
});

it("preserves scheduled date and state filters on overview requests and every journey drill-down",async()=>{
 vi.stubGlobal("fetch",vi.fn().mockImplementation(async()=>response({trips:[{status:8,label:"COMPLETED",count:3}],rides:[{status:3,label:"PAYMENT PENDING",count:2}],generated_at:"2026-10-20T04:30:00Z",scope:"Gujarat · both endpoints",states:[{code:"GJ",name:"Gujarat"}]})));
 setup("overview",true,"/?from=2026-10-20&to=2026-10-20&state=GJ");
 await screen.findByText(/Gujarat · both endpoints/);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("/overview?from=2026-10-20&to=2026-10-20&state=GJ");
 for(const link of screen.getAllByRole("link")){
  const href=link.getAttribute("href")||"";
  if(href.startsWith("/trips?")){
   const query=new URLSearchParams(href.split("?")[1]);
   expect(query.get("from")).toBe("2026-10-20");expect(query.get("to")).toBe("2026-10-20");expect(query.get("state")).toBe("GJ");
  }
 }
 await userEvent.click(screen.getByText("Clear overview filters"));
 await screen.findByRole("link",{name:/Completed/});
 expect(String(vi.mocked(fetch).mock.calls.at(-1)![0])).toMatch(/\/overview$/);
});
