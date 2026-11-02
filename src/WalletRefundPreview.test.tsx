import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WalletRefundPreview } from "./WalletRefundPreview";
import { api } from "./api";
const access = vi.hoisted(() => ({ allowed: true }));
vi.mock("./useAuth", () => ({
  useAuth: () => ({
    session: {
      csrf_token: "csrf",
      staff: {
        permissions: access.allowed ? ["cases.wallet-refund.preview"] : [],
      },
    },
  }),
}));
vi.mock("./api", () => ({ api: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  access.allowed = true;
});
const preview = {
  amount_paise: 10000,
  reason: "Refund for cancellation",
  preview_token: "opaque",
  expires_at: new Date(Date.now() + 300000).toISOString(),
  checked_at: new Date().toISOString(),
};
async function prepare() {
  await userEvent.type(
    screen.getByLabelText("Full-refund reason"),
    preview.reason,
  );
  await userEvent.click(screen.getByText("Prepare full-refund preview"));
}
it("prepares explicit full refund and rechecks using the opaque reference", async () => {
  vi.mocked(api).mockResolvedValue(preview);
  render(<WalletRefundPreview id="case" />);
  expect(api).not.toHaveBeenCalled();
  await prepare();
  await screen.findByText("₹100.00");
  expect(api).toHaveBeenLastCalledWith(
    "/ride-cases/case/wallet-refund-preview",
    expect.objectContaining({ body: { reason: preview.reason }, csrf: "csrf" }),
  );
  await userEvent.click(screen.getByText("Recheck preview"));
  await screen.findByText("Preview only · Not approved");
  expect(api).toHaveBeenLastCalledWith(
    "/ride-cases/case/wallet-refund-preview/check",
    expect.objectContaining({ body: { preview_token: "opaque" } }),
  );
  expect(screen.queryByText("Execute refund")).toBeNull();
});
it("removes stale preview after failed recheck", async () => {
  vi.mocked(api)
    .mockResolvedValueOnce(preview)
    .mockRejectedValueOnce(new Error("Evidence changed"));
  render(<WalletRefundPreview id="case" />);
  await prepare();
  await screen.findByText("₹100.00");
  await userEvent.click(screen.getByText("Recheck preview"));
  await screen.findByText("Evidence changed");
  expect(screen.queryByText("₹100.00")).toBeNull();
});
it("ignores cancelled responses and hides controls without permission", async () => {
  let resolve!: (v: unknown) => void;
  vi.mocked(api).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const view = render(<WalletRefundPreview id="case" />);
  await prepare();
  await userEvent.click(screen.getByText("Cancel preview"));
  resolve(preview);
  await waitFor(() => expect(screen.queryByText("₹100.00")).toBeNull());
  view.unmount();
  access.allowed = false;
  render(<WalletRefundPreview id="case" />);
  expect(screen.queryByText("Full wallet refund preview")).toBeNull();
});
it("expired previews offer a new preview rather than a freshness check", async () => {
  vi.mocked(api).mockResolvedValue({
    ...preview,
    expires_at: new Date(0).toISOString(),
  });
  render(<WalletRefundPreview id="case" />);
  await prepare();
  await screen.findByText("Preview expired");
  expect(screen.queryByText("Recheck preview")).toBeNull();
  expect(screen.getByText("Prepare new preview")).toBeTruthy();
});

it('partial preview sends the exact manual amount, shows the remainder and offers no full-refund submission',async()=>{
 const user=userEvent.setup();vi.mocked(api).mockResolvedValue({...preview,amount_paise:3001,remaining_held_paise:6999});render(<WalletRefundPreview id="case" partial/>);
 await user.type(screen.getByLabelText('Partial-refund reason'),'Disputed fare reviewed');await user.type(screen.getByLabelText('Refund amount (INR)'),'30.01');await user.click(screen.getByText('Prepare partial-refund preview'));
 await waitFor(()=>expect(api).toHaveBeenCalledWith('/ride-cases/case/partial-refund-preview',expect.objectContaining({body:{reason:'Disputed fare reviewed',amount:'30.01'},csrf:'csrf'})));
 expect(await screen.findByText('₹69.99')).toBeTruthy();expect(screen.getByText('₹30.01')).toBeTruthy();expect(screen.queryByText(/Submit refund proposal/)).toBeNull();expect(screen.getByText(/Submit for independent review before an authorized reviewer can apply the refund/)).toBeTruthy();
});
