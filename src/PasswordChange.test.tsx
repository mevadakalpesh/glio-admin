import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordChange } from "./PasswordChange";
import { AuthContext } from "./useAuth";
import type { Auth } from "./authTypes";
import { api } from "./api";
vi.mock("./api", () => ({ api: vi.fn() }));
function setup(requireMfa = true) {
  const auth: Auth = {
    session: {
      staff: {
        id: "staff",
        name: "Staff",
        email: "staff@example.test",
        role: "support",
        active: true,
        mfa_enabled: requireMfa,
        mfa_required: requireMfa,
        permissions: [],
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
      <PasswordChange />
    </AuthContext.Provider>,
  );
  return auth;
}
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
async function fill(next = "a replacement strong password", confirm = next) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Change password" }));
  await user.type(
    screen.getByLabelText("Current password"),
    "current correct password",
  );
  await user.type(screen.getByLabelText("New password", { exact: true }), next);
  await user.type(screen.getByLabelText("Confirm new password"), confirm);
  await user.type(screen.getByLabelText("Authenticator code"), "123456");
  await user.click(screen.getByRole("checkbox"));
  return user;
}
it("sends both factors with CSRF, clears the form and reloads authentication after success", async () => {
  const auth = setup();
  vi.mocked(api).mockResolvedValue({ changed: true, signed_out: true });
  const user = await fill();
  await user.click(
    screen.getByRole("button", { name: "Change password and sign out" }),
  );
  await waitFor(() => expect(auth.reload).toHaveBeenCalledTimes(1));
  expect(api).toHaveBeenCalledWith("/auth/change-password", {
    method: "POST",
    csrf: "csrf",
    body: {
      current_password: "current correct password",
      new_password: "a replacement strong password",
      code: "123456",
    },
  });
  expect(
    (screen.getByLabelText("Current password") as HTMLInputElement).value,
  ).toBe("");
});
it("rejects mismatched confirmation before calling the server", async () => {
  setup();
  const user = await fill(
    "a replacement strong password",
    "a different strong password",
  );
  await user.click(
    screen.getByRole("button", { name: "Change password and sign out" }),
  );
  expect((await screen.findByRole("alert")).textContent).toContain(
    "do not match",
  );
  expect(api).not.toHaveBeenCalled();
});
it("keeps failed verification visible, clears the used code and does not sign out", async () => {
  const auth = setup();
  vi.mocked(api).mockRejectedValue(
    new Error("Try the next authenticator code."),
  );
  const user = await fill();
  await user.click(
    screen.getByRole("button", { name: "Change password and sign out" }),
  );
  await screen.findByRole("alert");
  expect(auth.reload).not.toHaveBeenCalled();
  expect(
    (screen.getByLabelText("Authenticator code") as HTMLInputElement).value,
  ).toBe("");
});
it("cancelling discards password fields without a request", async () => {
  setup();
  const user = await fill();
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByLabelText("Current password")).toBeNull();
  expect(api).not.toHaveBeenCalled();
});

it("development password changes do not ask for an authenticator code", async()=>{
 setup(false);const user=userEvent.setup();await user.click(screen.getByRole("button",{name:"Change password"}));
 expect(screen.queryByText(/Use a fresh six-digit code/)).toBeNull();
 expect(document.querySelector('input[name="code"]')).toBeNull();
 expect(screen.getByLabelText("Current password")).toBeTruthy();
});
