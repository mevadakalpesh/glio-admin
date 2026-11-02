import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthContext } from "./useAuth";
import type { Auth } from "./authTypes";
import { Sessions } from "./Sessions";
const entries = [
  {
    id: "current",
    current: true,
    user_agent: "Current browser",
    ip: "127.0.0.1",
    created_at: "2026-10-18T04:30:00Z",
    last_seen_at: "2026-10-18T04:30:00Z",
    expires_at: "2026-10-18T12:30:00Z",
  },
  {
    id: "other",
    current: false,
    user_agent: "Other browser",
    ip: "127.0.0.2",
    created_at: "2026-10-18T04:30:00Z",
    last_seen_at: "2026-10-18T04:30:00Z",
    expires_at: "2026-10-18T12:30:00Z",
  },
];
const response = (data: unknown, status = 200) =>
  new Response(
    JSON.stringify(
      status === 200
        ? { success: true, data }
        : { success: false, message: "Storage unavailable. Try again." },
    ),
    { status },
  );
function setup() {
  const auth: Auth = {
    session: {
      staff: {
        id: "staff",
        name: "Staff",
        email: "staff@example.test",
        role: "support",
        permissions: [],
        active: true,
        mfa_enabled: true,
      },
      csrf_token: "csrf",
    },
    loading: false,
    unavailable: "",
    recovery: [],
    accept: vi.fn(),
    reload: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    acknowledgeRecovery: vi.fn(),
  };
  render(
    <AuthContext.Provider value={auth}>
      <Sessions />
    </AuthContext.Provider>,
  );
  return auth;
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("renders own sessions for any staff role with IST times and confirms before revocation", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(response({ items: entries, total: 2, page: 1 }));
  vi.stubGlobal("fetch", fetcher);
  setup();
  const user = userEvent.setup();
  await screen.findByText("Current browser");
  expect(screen.getByText("This session")).toBeTruthy();
  expect(screen.getAllByText(/10:00/).length).toBeGreaterThan(0);
  await user.click(
    screen.getByRole("button", { name: "Sign out session" }),
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: "Keep session" }));
  expect(fetcher).toHaveBeenCalledTimes(1);
  await user.click(
    screen.getByRole("button", { name: "Sign out session" }),
  );
  fetcher
    .mockResolvedValueOnce(response({ signed_out: false }))
    .mockResolvedValue(response({ items: [entries[0]], total: 1, page: 1 }));
  await user.click(screen.getByRole("button", { name: "Confirm sign out" }));
  await screen.findByText(
    "Session signed out. It can no longer access Gilo Admin.",
  );
  expect(fetcher.mock.calls[1][0]).toBe(
    "/api/admin/v1/auth/sessions/other/revoke",
  );
  expect(fetcher.mock.calls[1][1].headers["X-CSRF-Token"]).toBe("csrf");
  await waitFor(() => expect(screen.queryByText("Other browser")).toBeNull());
});
it("reloads authentication when the current session is revoked", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response({ items: [entries[0]], total: 1, page: 1 }))
    .mockResolvedValue(response({ signed_out: true }));
  vi.stubGlobal("fetch", fetcher);
  const auth = setup();
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Sign out this session" }),
  );
  await user.click(screen.getByRole("button", { name: "Confirm sign out" }));
  await waitFor(() => expect(auth.reload).toHaveBeenCalledTimes(1));
});
it("shows failed revocation without claiming success and supports refreshing a failed list", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response({}, 503))
    .mockResolvedValue(response({ items: entries, total: 2, page: 1 }));
  vi.stubGlobal("fetch", fetcher);
  setup();
  const user = userEvent.setup();
  await screen.findByRole("alert");
  await user.click(screen.getByRole("button", { name: "Refresh sessions" }));
  await screen.findByText("Other browser");
  await user.click(
    screen.getByRole("button", { name: "Sign out session" }),
  );
  fetcher.mockResolvedValue(response({}, 503));
  await user.click(screen.getByRole("button", { name: "Confirm sign out" }));
  await screen.findByRole("alert");
  expect(
    screen.queryByText(
      "Session signed out. It can no longer access Gilo Admin.",
    ),
  ).toBeNull();
  expect(screen.getByRole("button", { name: "Keep session" })).toBeTruthy();
});
