import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CaseClosureReadiness } from "./CaseClosureReadiness";
import { api } from "./api";
const access = vi.hoisted(() => ({ allowed: true }));
vi.mock("./useAuth", () => ({
  useAuth: () => ({
    session: {
      csrf_token: "csrf",
      staff: { permissions: access.allowed ? ["cases.close"] : [] },
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
  eligible: true,
  basis: "no_recorded_payment",
  blockers: [],
  checked_at: "2026-10-18T00:00:00Z",
};
async function check() {
  await userEvent.type(
    screen.getByLabelText("Closure review reason"),
    "Review ended ride",
  );
  await userEvent.click(screen.getByText("Check closure readiness"));
}
it("checks explicitly with a reason and never claims approval", async () => {
  vi.mocked(api).mockResolvedValue(result);
  render(<CaseClosureReadiness id="case" />);
  expect(api).not.toHaveBeenCalled();
  await check();
  await screen.findByText("Snapshot checks passed · Not approved");
  expect(api).toHaveBeenCalledWith(
    "/ride-cases/case/closure-readiness",
    expect.objectContaining({
      body: { reason: "Review ended ride" },
      csrf: "csrf",
    }),
  );
  expect(screen.queryByText("Confirm case closure")).toBeNull();
});
it("shows blockers and discards old results on a failed refresh", async () => {
  vi.mocked(api)
    .mockResolvedValueOnce({
      ...result,
      eligible: false,
      blockers: ["Payment review required"],
    })
    .mockRejectedValueOnce(new Error("Unavailable"));
  render(<CaseClosureReadiness id="case" />);
  await check();
  await screen.findByText("Payment review required");
  await userEvent.click(screen.getByText("Refresh readiness"));
  await screen.findByText("Unavailable");
  expect(screen.queryByText("Payment review required")).toBeNull();
});
it("ignores cancelled responses and hides the section without permission", async () => {
  let resolve!: (v: unknown) => void;
  vi.mocked(api).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const view = render(<CaseClosureReadiness id="case" />);
  await check();
  await userEvent.click(screen.getByText("Cancel check"));
  resolve(result);
  await waitFor(() =>
    expect(
      screen.queryByText("Snapshot checks passed · Not approved"),
    ).toBeNull(),
  );
  view.unmount();
  access.allowed = false;
  render(<CaseClosureReadiness id="case" />);
  expect(screen.queryByText("Case closure readiness")).toBeNull();
});

it('identifies verified remainder outcomes without describing them as an ordinary full refund',async()=>{
 vi.mocked(api).mockResolvedValue({...result,basis:'verified_wallet_remainder_settlement'});
 render(<CaseClosureReadiness id="case" />);await check();
 await screen.findByText('Partial refund and traveler remainder settlement verified against the wallet ledger.');
 expect(screen.queryByText('Full wallet refund and ledger evidence verified.')).toBeNull();
});
