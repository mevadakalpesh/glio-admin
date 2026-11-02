import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WalletRefundAssessment } from "./WalletRefundAssessment";
import { api } from "./api";
const access = vi.hoisted(() => ({ allowed: true }));
vi.mock("./useAuth", () => ({
  useAuth: () => ({
    session: {
      csrf_token: "csrf",
      staff: {
        permissions: access.allowed ? ["cases.wallet-refund.assess"] : [],
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
const result = {
  checks_passed: true,
  blockers: [],
  illustrative_full_refund_paise: 10000,
  execution_available: false,
  assessed_at: "2026-10-18T00:00:00Z",
};
async function assess() {
  await userEvent.type(
    screen.getByLabelText("Assessment reason"),
    "Review cancellation funds",
  );
  await userEvent.click(screen.getByText("Assess wallet refund"));
}
it("requires reason and displays a non-authorizing illustrative amount with no refund action", async () => {
  vi.mocked(api).mockResolvedValue(result);
  render(<WalletRefundAssessment id="case" />);
  expect(api).not.toHaveBeenCalled();
  await assess();
  await screen.findByText("Snapshot checks passed · Not approved");
  expect(screen.getByText("₹100.00")).toBeTruthy();
  expect(screen.queryByText("Execute refund")).toBeNull();
  expect(api).toHaveBeenCalledWith(
    "/ride-cases/case/wallet-refund-assessment",
    expect.objectContaining({
      method: "POST",
      csrf: "csrf",
      body: { reason: "Review cancellation funds" },
    }),
  );
});
it("shows blockers without a refundable amount", async () => {
  vi.mocked(api).mockResolvedValue({
    ...result,
    checks_passed: false,
    illustrative_full_refund_paise: null,
    blockers: ["Funds are frozen."],
  });
  render(<WalletRefundAssessment id="case" />);
  await assess();
  await screen.findByText("Funds are frozen.");
  expect(screen.queryByText("₹100.00")).toBeNull();
  await userEvent.click(screen.getByText("Hide assessment"));
  expect(screen.queryByText("Funds are frozen.")).toBeNull();
});
it("ignores a response after cancellation", async () => {
  let resolve!: (value: unknown) => void;
  vi.mocked(api).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  render(<WalletRefundAssessment id="case" />);
  await assess();
  await userEvent.click(screen.getByText("Cancel assessment"));
  resolve(result);
  await waitFor(() =>
    expect(screen.getByText("Assess wallet refund")).toBeTruthy(),
  );
  expect(screen.queryByText("₹100.00")).toBeNull();
});
it("requires its own permission", () => {
  access.allowed = false;
  render(<WalletRefundAssessment id="case" />);
  expect(api).not.toHaveBeenCalled();
  expect(screen.queryByText("Wallet refund assessment")).toBeNull();
});

it("assesses the chosen remainder outcome and displays server allocations without execution", async()=>{
 vi.mocked(api).mockResolvedValue({...result,allocation:{original_total_paise:10000,already_refunded_paise:3001,remaining_held_paise:6999,rider_refund_paise:0,traveler_payout_paise:5949,platform_fee_paise:1050}});
 render(<WalletRefundAssessment id="case" remainder />);
 await userEvent.selectOptions(screen.getByLabelText("Proposed outcome"),"settle_traveler");
 await userEvent.type(screen.getByLabelText("Assessment reason"),"Review the held remainder");
 await userEvent.click(screen.getByText("Assess remaining balance"));
 await screen.findByText("₹59.49");
 expect(screen.getByText("₹10.50")).toBeTruthy();expect(screen.getByText("₹69.99")).toBeTruthy();
 expect(screen.getByText(/This assessment is not an approval/)).toBeTruthy();
 expect(api).toHaveBeenCalledWith("/ride-cases/case/remainder-assessment",expect.objectContaining({body:{reason:"Review the held remainder",outcome:"settle_traveler"}}));
});
it("withholds remainder allocation when reconciliation fails",async()=>{
 vi.mocked(api).mockResolvedValue({...result,checks_passed:false,blockers:["Partial refund credit does not reconcile."],allocation:null});
 render(<WalletRefundAssessment id="case" remainder />);
 await userEvent.type(screen.getByLabelText("Assessment reason"),"Review remaining balance");
 await userEvent.click(screen.getByText("Assess remaining balance"));
 await screen.findByText("Partial refund credit does not reconcile.");
 expect(screen.queryByText("Proposed traveler payout")).toBeNull();
});
