import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProposalDecision } from "./ProposalDecision";
import { api } from "./api";
const access = vi.hoisted(() => ({ allowed: true }));
vi.mock("./useAuth", () => ({
  useAuth: () => ({
    session: {
      csrf_token: "csrf",
      staff: {
        permissions: access.allowed
          ? ["cases.proposals.decide", "cases.wallet-refund.decide"]
          : [],
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
  proposalId: "proposal",
  revision: "a".repeat(64),
  canApprove: true,
  canReject: true,
};
async function review(kind = "approval") {
  await userEvent.click(screen.getByText("Review " + kind));
  await userEvent.type(
    screen.getByLabelText("Decision reason"),
    "Independent evidence review completed.",
  );
  await userEvent.click(screen.getByText("Review decision"));
}
it("requires a reason and confirmation before approving without executing", async () => {
  const saved = vi.fn();
  vi.mocked(api).mockResolvedValue({});
  render(<ProposalDecision {...props} onSaved={saved} />);
  await review();
  expect(api).not.toHaveBeenCalled();
  await userEvent.click(screen.getByText("Confirm approval"));
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(api).toHaveBeenCalledWith(
    "/ride-cases/case/proposals/proposal/decision",
    expect.objectContaining({
      method: "POST",
      csrf: "csrf",
      body: expect.objectContaining({
        decision: "approve",
        revision: props.revision,
        reason: "Independent evidence review completed.",
      }),
    }),
  );
});
it("offers rejection but not approval for changed context", async () => {
  const saved = vi.fn();
  vi.mocked(api).mockResolvedValue({});
  render(<ProposalDecision {...props} canApprove={false} onSaved={saved} />);
  expect(screen.queryByText("Review approval")).toBeNull();
  await review("rejection");
  await userEvent.click(screen.getByText("Confirm rejection"));
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(api).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      body: expect.objectContaining({ decision: "reject" }),
    }),
  );
});
it("retries the same decision ID and reports no success on failure", async () => {
  const saved = vi.fn();
  vi.mocked(api)
    .mockRejectedValueOnce(Error("Unavailable"))
    .mockResolvedValueOnce({});
  render(<ProposalDecision {...props} onSaved={saved} />);
  await review();
  await userEvent.click(screen.getByText("Confirm approval"));
  await screen.findByRole("alert");
  expect(saved).not.toHaveBeenCalled();
  await userEvent.click(screen.getByText("Confirm approval"));
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(vi.mocked(api).mock.calls[0][1]?.body).toEqual(
    vi.mocked(api).mock.calls[1][1]?.body,
  );
});
it("hides decision controls without permission or eligibility", () => {
  access.allowed = false;
  const view = render(<ProposalDecision {...props} onSaved={() => {}} />);
  expect(screen.queryByText("Review approval")).toBeNull();
  access.allowed = true;
  view.rerender(
    <ProposalDecision
      {...props}
      canApprove={false}
      canReject={false}
      onSaved={() => {}}
    />,
  );
  expect(screen.queryByText("Review rejection")).toBeNull();
  expect(api).not.toHaveBeenCalled();
});

it("binds financial review to the displayed refund amount and revision", async () => {
  vi.mocked(api).mockResolvedValue({});
  render(
    <ProposalDecision
      {...props}
      financial={{ amount_paise: 10000, revision: "f".repeat(64) }}
      onSaved={vi.fn()}
    />,
  );
  await review();
  expect(screen.getByText("Full wallet refund: ₹100.00")).toBeTruthy();
  await userEvent.click(screen.getByText("Confirm approval"));
  expect(api).toHaveBeenLastCalledWith(
    expect.any(String),
    expect.objectContaining({
      body: expect.objectContaining({ financial_revision: "f".repeat(64) }),
    }),
  );
});

it('partial approval shows the refund and remainder and submits the bound financial revision',async()=>{const saved=vi.fn();vi.mocked(api).mockResolvedValue({});render(<ProposalDecision {...props} financial={{amount_paise:3001,remaining_held_paise:6999,revision:'bound-partial-revision'}} onSaved={saved}/>);await review();expect(screen.getByText(/Remaining held after refund: ₹69.99/)).toBeTruthy();expect(screen.getByText(/₹30.01/)).toBeTruthy();await userEvent.click(screen.getByText('Confirm approval'));await waitFor(()=>expect(saved).toHaveBeenCalledOnce());expect(api).toHaveBeenCalledWith('/ride-cases/case/proposals/proposal/decision',expect.objectContaining({body:expect.objectContaining({financial_revision:'bound-partial-revision'})}));});
