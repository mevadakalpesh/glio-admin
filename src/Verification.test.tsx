import {addFilter} from "./filterTestHelpers";
import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "./useAuth";
import type { Auth } from "./authTypes";
import { Verification } from "./Verification";
const auth = (allowed = true): Auth => ({
  session: {
    staff: {
      id: "owner",
      name: "Owner",
      email: "test@example.test",
      role: "owner",
      active: true,
      mfa_enabled: true,
      permissions: allowed
        ? ["verification.read", "verification.evidence.read"]
        : [],
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
const record = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "account",
  document_type: "aadhaar",
  verification_status: "pending",
  created_at: "2026-10-18T04:30:00Z",
  updated_at: "2026-10-18T04:30:00Z",
  evidence: [
    { side: "front", available: true, revision: "revision1" },
    { side: "back", available: false, revision: "empty" },
  ],
};
const list = () =>
  new Response(
    JSON.stringify({
      success: true,
      data: { items: [record], total: 1, page: 1 },
    }),
    { headers: { "Content-Type": "application/json" } },
  );
function setup(allowed = true) {
  return render(
    <AuthContext.Provider value={auth(allowed)}>
      <MemoryRouter>
        <Verification />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("does not fetch evidence for unauthorized staff", () => {
  vi.stubGlobal("fetch", vi.fn());
  setup(false);
  expect(screen.getByText(/does not include verification/)).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
});
it("requires a review reason before fetching image and releases its object URL on close", async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(list())
      .mockResolvedValueOnce(
        new Response("image", { headers: { "Content-Type": "image/webp" } }),
      ),
  );
  const create = vi.fn(() => "blob:private-view"),
    revoke = vi.fn();
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = create;
      static revokeObjectURL = revoke;
    },
  );
  setup();
  await user.click(await screen.findByRole("button", { name: "Actions for aadhaar" }));
  await user.click(await screen.findByRole("menuitem", { name: "View Front" }));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(
    (
      screen.getByRole("button", {
        name: "Open protected image",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  await user.type(
    screen.getByLabelText("Review reason"),
    "Inspect identity evidence",
  );
  await user.click(
    screen.getByRole("button", { name: "Open protected image" }),
  );
  expect(await screen.findByRole("img")).toBeTruthy();
  const options = vi.mocked(fetch).mock.calls[1][1];
  expect(options?.method).toBe("POST");
  expect(new Headers(options?.headers).get("X-CSRF-Token")).toBe("csrf");
  expect(JSON.parse(String(options?.body))).toEqual({
    reason: "Inspect identity evidence",
    revision: "revision1",
  });
  await user.click(screen.getByRole("button", { name: "Close evidence" }));
  expect(screen.queryByRole("img")).toBeNull();
  await waitFor(() => expect(revoke).toHaveBeenCalledWith("blob:private-view"));
});
it("shows storage failure without opening the original URL or rendering a broken image", async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(list())
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Storage is unsupported" }), {
          status: 422,
          headers: { "Content-Type": "application/json" },
        }),
      ),
  );
  setup();
  await user.click(await screen.findByRole("button", { name: "Actions for aadhaar" }));
  await user.click(await screen.findByRole("menuitem", { name: "View Front" }));
  await user.type(screen.getByLabelText("Review reason"), "Review evidence");
  await user.click(
    screen.getByRole("button", { name: "Open protected image" }),
  );
  expect((await screen.findByRole("alert")).textContent).toBe(
    "Storage is unsupported",
  );
  expect(screen.queryByRole("img")).toBeNull();
});

it("regional reviewers see only the vehicle queue even from an identity deep link", async () => {
  const regional = auth();
  regional.session!.staff.role = "verification";
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(list()));
  vi.stubGlobal("fetch", fetcher);
  render(<AuthContext.Provider value={regional}><MemoryRouter initialEntries={["/verification?kind=documents&status=pending"]}><Verification /></MemoryRouter></AuthContext.Provider>);
  await screen.findByText("account");
  expect(fetcher.mock.calls[0][0]).toContain("/verification/vehicles?");
  expect(fetcher.mock.calls[0][0]).not.toContain("status=pending");
  expect(screen.queryByRole("button", { name: "Identity documents" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Selfies" })).toBeNull();
  expect(screen.queryByRole("link", { name: "account" })).toBeNull();
});

it("automatically combines search and status, and clears both without submit buttons", async () => {
  const user = userEvent.setup();
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(list()));
  vi.stubGlobal("fetch", fetcher);
  setup();
  await screen.findByText("account");
  expect(screen.queryByRole("button", {name: "Clear all filters"})).toBeNull();
  expect(screen.queryByRole("button", {name: "Apply filters"})).toBeNull();
  await addFilter("Account ID");
  await user.type(screen.getByLabelText("Account ID"), record.id);
  await addFilter("Recorded status");
  await user.selectOptions(screen.getByLabelText("Recorded status"), "approved");
  await waitFor(() => {
    const url = String(fetcher.mock.calls.at(-1)?.[0]);
    expect(url).toContain(`person=${record.id}`);
    expect(url).toContain("status=approved");
  });
  await user.click(screen.getByRole("button", {name: "Clear all filters"}));
  await waitFor(() => expect(String(fetcher.mock.calls.at(-1)?.[0])).not.toContain("person="));
  expect(screen.queryByRole("button", {name: "Clear all filters"})).toBeNull();
  expect(screen.queryByLabelText("Account ID")).toBeNull();
  expect(screen.queryByLabelText("Recorded status")).toBeNull();
});
it('keeps embedded verification scoped to the customer while switching categories', async()=>{
 const user=userEvent.setup();
 const request=vi.fn().mockImplementation(()=>Promise.resolve(new Response(JSON.stringify({success:true,data:{items:[],total:0,page:1}}),{headers:{'Content-Type':'application/json'}})));
 vi.stubGlobal('fetch',request);
 render(<AuthContext.Provider value={auth()}><MemoryRouter initialEntries={['/people?id=customer&person=other']}><Verification personId="11111111-1111-4111-8111-111111111111"/></MemoryRouter></AuthContext.Provider>);
 await screen.findByText(/No identity documents submitted/);
 await user.click(screen.getByRole('button',{name:'Selfies'}));
 await screen.findByText(/No verification selfies submitted/);
 expect(request.mock.calls.every(([url])=>String(url).includes('person=11111111-1111-4111-8111-111111111111'))).toBe(true);
 expect(request.mock.calls.some(([url])=>String(url).includes('/verification/selfies?'))).toBe(true);
});
