import { useState } from "react";
import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InvitationActions } from "./InvitationActions";
import { api } from "./api";
import type { Staff } from "./authTypes";
vi.mock("./api", () => ({ api: vi.fn() }));
const staff: Staff = {
  id: "invited",
  name: "New staff",
  email: "staff@example.test",
  role: "support",
  active: true,
  mfa_enabled: false,
  permissions: [],
  invitation_state: "expired",
  invitation_revision: "revision",
  invitation_expires_at: "2026-10-18T04:30:00Z",
};
function setup(changes: Partial<Staff> = {}, allowRecovery = false) {
  const complete = vi.fn();
  function Host() {
    const [busy, setBusy] = useState(false);
    return (
      <InvitationActions
        staff={{ ...staff, ...changes }}
        allowRecovery={allowRecovery}
        csrf="csrf"
        busy={busy}
        onBusy={setBusy}
        onComplete={complete}
      />
    );
  }
  render(<Host />);
  return complete;
}
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("requires confirmation and a reason before replacing the invitation", async () => {
  const complete = setup(),
    user = userEvent.setup();
  vi.mocked(api).mockResolvedValue({
    invitation_url: "https://example.test/activate#new",
  });
  await user.click(screen.getByRole("button", { name: "Renew invitation" }));
  expect(api).not.toHaveBeenCalled();
  await user.type(
    screen.getByLabelText("Invitation change reason"),
    "Previous link has expired",
  );
  await user.click(screen.getByRole("button", { name: "Confirm renewal" }));
  await waitFor(() =>
    expect(complete).toHaveBeenCalledWith("https://example.test/activate#new"),
  );
  expect(api).toHaveBeenCalledWith("/staff/invited/invitation", {
    method: "POST",
    csrf: "csrf",
    body: {
      action: "renew",
      reason: "Previous link has expired",
      revision: "revision",
    },
  });
});
it("revokes without creating a link and supports cancelling the confirmation", async () => {
  const complete = setup(),
    user = userEvent.setup();
  vi.mocked(api).mockResolvedValue({ revoked: true });
  await user.click(screen.getByRole("button", { name: "Revoke invitation" }));
  await user.click(screen.getByRole("button", { name: "Keep invitation" }));
  expect(api).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Revoke invitation" }));
  await user.type(
    screen.getByLabelText("Invitation change reason"),
    "Invitation no longer needed",
  );
  await user.click(screen.getByRole("button", { name: "Confirm revocation" }));
  await waitFor(() => expect(complete).toHaveBeenCalledWith(""));
});
it("keeps failed changes visible and does not claim success", async () => {
  const complete = setup(),
    user = userEvent.setup();
  vi.mocked(api).mockRejectedValue(
    new Error("Invitation changed. Refresh the team list."),
  );
  await user.click(screen.getByRole("button", { name: "Renew invitation" }));
  await user.type(
    screen.getByLabelText("Invitation change reason"),
    "Renew expired link",
  );
  await user.click(screen.getByRole("button", { name: "Confirm renewal" }));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Invitation changed",
  );
  expect(complete).not.toHaveBeenCalled();
});
it("does not offer invitation reset for accepted accounts", () => {
  setup({ invitation_state: "mfa_pending" });
  expect(screen.queryByRole("button", { name: "Renew invitation" })).toBeNull();
});
it("requires account activation before renewal but permits withdrawing an unused link", () => {
  setup({ active: false });
  expect(
    (
      screen.getByRole("button", {
        name: "Renew invitation",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(
    (
      screen.getByRole("button", {
        name: "Revoke invitation",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(false);
});

it("requires identity confirmation for owner-assisted recovery", async () => {
  const complete = setup({ invitation_state: "enrolled", mfa_enabled: true }, true);
  const user = userEvent.setup();
  vi.mocked(api).mockResolvedValue({ invitation_url: "https://example.test/activate#recovery" });
  await user.click(screen.getByRole("button", { name: "Recover staff account" }));
  await user.type(screen.getByLabelText("Invitation change reason"), "Identity confirmed by trusted contact");
  await user.click(screen.getByRole("button", { name: "Confirm account recovery" }));
  expect(api).not.toHaveBeenCalled();
  await user.click(screen.getByRole("checkbox"));
  await user.click(screen.getByRole("button", { name: "Confirm account recovery" }));
  await waitFor(() => expect(complete).toHaveBeenCalledWith("https://example.test/activate#recovery", true));
  expect(api).toHaveBeenCalledWith("/staff/invited/invitation", expect.objectContaining({ body: expect.objectContaining({ action: "recover", identity_verified: true, revision: "revision" }) }));
});
it("does not offer recovery without owner eligibility or for disabled staff", () => {
  setup({ invitation_state: "enrolled", active: false }, true);
  expect(screen.queryByRole("button", { name: "Recover staff account" })).toBeNull();
});
