import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthenticatorReplacement } from "./AuthenticatorReplacement";
import { api } from "./api";
const { accept } = vi.hoisted(() => ({ accept: vi.fn() }));
vi.mock("./api", () => ({ api: vi.fn() }));
vi.mock("./useAuth", () => ({ useAuth: () => ({ session: { csrf_token: "csrf", staff: { id: "staff" } }, accept }) }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
async function start() {
  const user = userEvent.setup();
  render(<AuthenticatorReplacement />);
  await user.click(screen.getByRole("button", { name: "Replace authenticator" }));
  await user.type(screen.getByLabelText("Current password"), "current passphrase");
  await user.type(screen.getByLabelText("Current authenticator code"), "123456");
  await user.click(screen.getByRole("button", { name: "Continue setup" }));
  return user;
}
it("requires new-device confirmation before presenting replacement backup codes", async () => {
  vi.mocked(api).mockResolvedValueOnce({ token: "setup-token", setup_secret: "NEWKEY", account: "staff@example.test" }).mockResolvedValueOnce({ recovery_codes: ["new-backup"], recovery_codes_remaining: 1 });
  const user = await start();
  await screen.findByText("NEWKEY");
  expect(accept).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText("New authenticator code"), "654321");
  await user.click(screen.getByRole("button", { name: "Confirm new authenticator" }));
  await waitFor(() => expect(accept).toHaveBeenCalledWith(expect.objectContaining({ recovery_codes: ["new-backup"] })));
  expect(api).toHaveBeenLastCalledWith("/auth/authenticator/confirm", expect.objectContaining({ body: { token: "setup-token", code: "654321" } }));
  expect(screen.queryByText("NEWKEY")).toBeNull();
});
it("failed confirmation shows uncertainty and does not claim replacement", async () => {
  vi.mocked(api).mockResolvedValueOnce({ token: "setup-token", setup_secret: "NEWKEY", account: "staff@example.test" }).mockRejectedValueOnce(Error("Connection lost"));
  const user = await start();
  await user.type(await screen.findByLabelText("New authenticator code"), "654321");
  await user.click(screen.getByRole("button", { name: "Confirm new authenticator" }));
  expect((await screen.findByRole("alert")).textContent).toContain("may already be active");
  expect(accept).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Close setup" }));
  expect(screen.queryByText("NEWKEY")).toBeNull();
});
