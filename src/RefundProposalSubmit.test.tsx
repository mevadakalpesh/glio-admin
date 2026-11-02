import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RefundProposalSubmit } from "./RefundProposalSubmit";
import { api } from "./api";
const access = vi.hoisted(() => ({ allowed: true }));
vi.mock("./useAuth", () => ({
  useAuth: () => ({
    session: {
      csrf_token: "csrf",
      staff: {
        permissions: access.allowed ? ["cases.wallet-refund.propose"] : [],
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
const props = {
  caseId: "case",
  token: "opaque",
  amount: 10000,
  reason: "Cancellation evidence supports full refund",
};
it("confirms amount and uses the same submission ID when an outcome is unknown", async () => {
  const saved = vi.fn();
  vi.mocked(api)
    .mockRejectedValueOnce(new Error("Network unavailable"))
    .mockResolvedValueOnce({});
  const view = render(<RefundProposalSubmit {...props} onSaved={saved} />);
  await userEvent.click(screen.getByText("Review refund proposal"));
  expect(screen.getByText(/Submit full refund of ₹100.00/)).toBeTruthy();
  expect(api).not.toHaveBeenCalled();
  await userEvent.click(screen.getByText("Submit refund proposal"));
  await screen.findByText("Network unavailable");
  const body = vi.mocked(api).mock.calls[0][1]?.body;
  view.rerender(<RefundProposalSubmit {...props} expired onSaved={saved} />);
  await userEvent.click(screen.getByText("Retry same submission"));
  expect(vi.mocked(api).mock.calls[1][1]?.body).toEqual(body);
  expect(saved).toHaveBeenCalledOnce();
});
it("requires permission and prevents a new submission after preview expiry", async () => {
  const view = render(
    <RefundProposalSubmit {...props} expired onSaved={vi.fn()} />,
  );
  await userEvent.click(screen.getByText("Review refund proposal"));
  expect(screen.queryByText("Submit refund proposal")).toBeNull();
  view.unmount();
  access.allowed = false;
  render(<RefundProposalSubmit {...props} onSaved={vi.fn()} />);
  expect(screen.queryByText("Review refund proposal")).toBeNull();
});

it('partial proposal confirms the remaining hold and uses its separate endpoint with an idempotent retry',async()=>{const saved=vi.fn();vi.mocked(api).mockRejectedValueOnce(Error('Network unavailable')).mockResolvedValueOnce({});render(<RefundProposalSubmit {...props} partial amount={3001} remaining={6999} onSaved={saved}/>);await userEvent.click(screen.getByText('Review refund proposal'));expect(screen.getByText(/Submit partial refund of ₹30.01/)).toBeTruthy();expect(screen.getByText(/Remaining held: ₹69.99/)).toBeTruthy();await userEvent.click(screen.getByText('Submit refund proposal'));await screen.findByText('Network unavailable');const first=vi.mocked(api).mock.calls[0];expect(first[0]).toBe('/ride-cases/case/partial-refund-proposals');await userEvent.click(screen.getByText('Retry same submission'));expect(vi.mocked(api).mock.calls[1][1]?.body).toEqual(first[1]?.body);expect(saved).toHaveBeenCalledOnce();});
