import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecoveryRenewal } from "./RecoveryRenewal";
import { RecoveryCodes } from "./Login";
import { AuthContext } from "./useAuth";
import type { Auth } from "./authTypes";
import { api } from "./api";
vi.mock("./api", () => ({ api: vi.fn() }));
function setup(codes = false) {
  const auth: Auth = {
    session: {
      staff: {
        id: "staff",
        name: "Staff",
        email: "staff@example.test",
        role: "support",
        active: true,
        mfa_enabled: true,
        permissions: [],
      },
      csrf_token: "csrf",
      recovery_codes_remaining: 2,
    },
    loading: false,
    unavailable: "",
    recovery: ["newcode"],
    accept: vi.fn(),
    reload: vi.fn(),
    logout: vi.fn(),
    acknowledgeRecovery: vi.fn(),
  };
  render(
    <AuthContext.Provider value={auth}>
      {codes ? <RecoveryCodes /> : <RecoveryRenewal />}
    </AuthContext.Provider>,
  );
  return auth;
}
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
async function fill() {
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "Renew recovery codes" }),
  );
  await user.type(
    screen.getByLabelText("Current password"),
    "current correct password",
  );
  await user.type(screen.getByLabelText("Fresh authenticator code"), "123456");
  await user.click(screen.getByRole("checkbox"));
  return user;
}
it("renews with both factors and hands codes to the existing save-once screen", async () => {
  const auth = setup();
  vi.mocked(api).mockResolvedValue({
    recovery_codes: ["newcode"],
    recovery_codes_remaining: 10,
  });
  const user = await fill();
  await user.click(screen.getByRole("button", { name: "Confirm renewal" }));
  await waitFor(() =>
    expect(auth.accept).toHaveBeenCalledWith({
      ...auth.session,
      recovery_codes: ["newcode"],
      recovery_codes_remaining: 10,
    }),
  );
  expect(api).toHaveBeenCalledWith("/auth/renew-recovery", {
    method: "POST",
    csrf: "csrf",
    body: { current_password: "current correct password", code: "123456" },
  });
  expect(
    (screen.getByLabelText("Current password") as HTMLInputElement).value,
  ).toBe("");
  expect(auth.logout).not.toHaveBeenCalled();
});
it("does not show new codes on failure and explains ambiguous network outcomes", async () => {
  const auth = setup();
  vi.mocked(api).mockRejectedValue(new Error("Connection interrupted"));
  const user = await fill();
  await user.click(screen.getByRole("button", { name: "Confirm renewal" }));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "old codes may already be invalid",
  );
  expect(auth.accept).not.toHaveBeenCalled();
  expect(
    (screen.getByLabelText("Fresh authenticator code") as HTMLInputElement)
      .value,
  ).toBe("");
});
it("cancelling does not replace any codes", async () => {
  setup();
  const user = await fill();
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(api).not.toHaveBeenCalled();
  expect(screen.queryByLabelText("Current password")).toBeNull();
});
it("requires acknowledging secure storage before leaving the code display", async () => {
  const auth = setup(true),
    user = userEvent.setup();
  const button = screen.getByRole("button", {
    name: "Open workspace",
  }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  await user.click(screen.getByRole("checkbox"));
  await user.click(button);
  expect(auth.acknowledgeRecovery).toHaveBeenCalledTimes(1);
});
