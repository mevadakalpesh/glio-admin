import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "./auth";
import { useAuth } from "./useAuth";
import { Login, RecoveryCodes } from "./Login";
const response = (data: unknown, status = 200) =>
  new Response(
    JSON.stringify(
      status === 200
        ? { success: true, data }
        : { success: false, message: data },
    ),
    { status, headers: { "Content-Type": "application/json" } },
  );
function Harness() {
  const auth = useAuth();
  if (auth.loading) return <p>Loading</p>;
  if (auth.recovery.length) return <RecoveryCodes />;
  return auth.session ? <p>Workspace unlocked</p> : <Login />;
}
beforeEach(() => {
  window.history.replaceState(null, "", "/");
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("staff sign-in", () => {
  it("keeps workspace locked after password until MFA succeeds, then gates on saving recovery codes", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockResolvedValueOnce(response("Sign in", 401))
      .mockResolvedValueOnce(
        response({ step: "verify", csrf_token: "challenge-csrf" }),
      )
      .mockResolvedValueOnce(
        response({
          staff: { id: "1", name: "Owner", role: "owner", permissions: [] },
          csrf_token: "session-csrf",
          recovery_codes: ["1234567890abcdef"],
        }),
      );
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );
    await user.type(
      await screen.findByLabelText("Staff email"),
      "owner@example.test",
    );
    await user.type(screen.getByLabelText("Password"), "a long password");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByLabelText("Authenticator code")).toBeTruthy();
    expect(screen.queryByText("Workspace unlocked")).toBeNull();
    await user.type(screen.getByLabelText("Authenticator code"), "123456");
    await user.click(
      screen.getByRole("button", { name: "Verify and sign in" }),
    );
    expect(await screen.findByText("Save your recovery codes")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Open workspace",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Open workspace" }));
    expect(screen.getByText("Workspace unlocked")).toBeTruthy();
    expect(screen.queryByText("1234567890abcdef")).toBeNull();
    const request = vi.mocked(fetch).mock.calls[2][1];
    expect(new Headers(request?.headers).get("X-CSRF-Token")).toBe(
      "challenge-csrf",
    );
  });
  it("shows invalid MFA without unlocking or retrying the mutation automatically", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockResolvedValueOnce(response("Sign in", 401))
      .mockResolvedValueOnce(
        response({ step: "verify", csrf_token: "challenge-csrf" }),
      )
      .mockResolvedValueOnce(response("Invalid or already used code.", 401));
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );
    await user.type(
      await screen.findByLabelText("Staff email"),
      "owner@example.test",
    );
    await user.type(screen.getByLabelText("Password"), "a long password");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(
      await screen.findByLabelText("Authenticator code"),
      "123456",
    );
    await user.click(
      screen.getByRole("button", { name: "Verify and sign in" }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain("Invalid");
    expect(screen.queryByText("Workspace unlocked")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it("shows configuration failure instead of an unlocked demo workspace", async () => {
    vi.mocked(fetch).mockResolvedValue(
      response("Admin access has not been configured yet.", 503),
    );
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "not been configured",
      ),
    );
    expect(
      (screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.queryByText("Workspace unlocked")).toBeNull();
  });
});
it('accepts a server-issued development session without showing an authenticator challenge', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(response('Sign in',401)).mockResolvedValueOnce(response({staff:{id:'dev-owner',name:'Development Owner',email:'owner@gilo.test',role:'owner',permissions:[],active:true,mfa_enabled:false,mfa_required:false},csrf_token:'csrf'}));
  render(<AuthProvider><Harness/></AuthProvider>);
  const user=userEvent.setup();
  await user.type(await screen.findByLabelText('Staff email'),'owner@gilo.test');
  await user.type(screen.getByLabelText('Password',{exact:true}),'development password only');
  await user.click(screen.getByRole('button',{name:/^Continue$/}));
  expect(await screen.findByText('Workspace unlocked')).toBeTruthy();
  expect(screen.queryByText('Set up your authenticator')).toBeNull();
});
