import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProposalExecution } from "./ProposalExecution";
import { api } from "./api";
const access = vi.hoisted(() => ({ allowed: true }));
vi.mock("./useAuth", () => ({
  useAuth: () => ({
    session: {
      csrf_token: "csrf",
      staff: {
        permissions: access.allowed
          ? ["cases.proposals.execute", "cases.wallet-refund.execute", "cases.close"]
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
};
async function review() {
  await userEvent.click(screen.getByText("Apply further investigation"));
  await userEvent.type(
    screen.getByLabelText("Execution reason"),
    "Start evidence follow-up investigation.",
  );
  await userEvent.click(screen.getByText("Review execution"));
}
it("requires reason and confirmation and announces success only after response", async () => {
  const saved = vi.fn();
  vi.mocked(api).mockResolvedValue({});
  render(<ProposalExecution {...props} onSaved={saved} />);
  await review();
  expect(api).not.toHaveBeenCalled();
  expect(screen.getByText(/Existing payment holds stay in place/)).toBeTruthy();
  await userEvent.click(screen.getByText("Confirm investigation"));
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(api).toHaveBeenCalledWith(
    "/ride-cases/case/proposals/proposal/execute",
    expect.objectContaining({
      method: "POST",
      csrf: "csrf",
      body: expect.objectContaining({
        revision: props.revision,
        reason: "Start evidence follow-up investigation.",
      }),
    }),
  );
});
it("retries an unconfirmed result with the same execution ID", async () => {
  const saved = vi.fn();
  vi.mocked(api)
    .mockRejectedValueOnce(Error("Unavailable"))
    .mockResolvedValueOnce({});
  render(<ProposalExecution {...props} onSaved={saved} />);
  await review();
  await userEvent.click(screen.getByText("Confirm investigation"));
  await screen.findByRole("alert");
  expect(saved).not.toHaveBeenCalled();
  await userEvent.click(screen.getByText("Confirm investigation"));
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(vi.mocked(api).mock.calls[0][1]?.body).toEqual(
    vi.mocked(api).mock.calls[1][1]?.body,
  );
});
it("cancelling review performs no write", async () => {
  render(<ProposalExecution {...props} onSaved={() => {}} />);
  await review();
  await userEvent.click(screen.getByText("Cancel execution"));
  expect(api).not.toHaveBeenCalled();
  expect(screen.queryByText("Confirm investigation")).toBeNull();
});
it("does not expose execution without permission", () => {
  access.allowed = false;
  render(<ProposalExecution {...props} onSaved={() => {}} />);
  expect(screen.queryByText("Apply further investigation")).toBeNull();
  expect(api).not.toHaveBeenCalled();
});

it("confirms the refund amount and preserves the same execution after an uncertain response", async () => {
  const saved = vi.fn();
  vi.mocked(api)
    .mockRejectedValueOnce(new Error("Connection lost"))
    .mockResolvedValueOnce({});
  render(
    <ProposalExecution
      {...props}
      financial={{ amount_paise: 10000, revision: "f".repeat(64) }}
      onSaved={saved}
    />,
  );
  await userEvent.click(screen.getByText("Apply approved wallet refund"));
  expect(screen.getByText("₹100.00")).toBeTruthy();
  await userEvent.type(
    screen.getByLabelText("Execution reason"),
    "Apply independently approved refund",
  );
  await userEvent.click(screen.getByText("Review execution"));
  expect(api).not.toHaveBeenCalled();
  await userEvent.click(screen.getByText("Confirm wallet refund"));
  await screen.findByText("Connection lost");
  expect(saved).not.toHaveBeenCalled();
  const first = vi.mocked(api).mock.calls[0];
  expect(first[0]).toBe("/ride-cases/case/proposals/proposal/refund");
  expect(first[1]?.body).toEqual(
    expect.objectContaining({ financial_revision: "f".repeat(64) }),
  );
  expect(screen.queryByText("Edit execution reason")).toBeNull();
  await userEvent.click(screen.getByText("Retry same refund"));
  expect(vi.mocked(api).mock.calls[1][1]?.body).toEqual(first[1]?.body);
  expect(saved).toHaveBeenCalledOnce();
});

it("requires explicit closure confirmation and sends to the closure endpoint", async () => {
  vi.mocked(api).mockResolvedValue({});
  render(<ProposalExecution {...props} closing onSaved={vi.fn()} />);
  await userEvent.click(screen.getByText("Review case closure"));
  await userEvent.type(
    screen.getByLabelText("Execution reason"),
    "Refund verified and case review finished",
  );
  await userEvent.click(screen.getByText("Review execution"));
  expect(api).not.toHaveBeenCalled();
  await userEvent.click(screen.getByText("Confirm case closure"));
  expect(api).toHaveBeenLastCalledWith(
    "/ride-cases/case/proposals/proposal/close",
    expect.objectContaining({ method: "POST" }),
  );
});

it("shows the remaining hold and binds partial execution to the approved financial revision", async () => {
  const saved = vi.fn();
  vi.mocked(api).mockResolvedValue({});
  render(<ProposalExecution {...props} financial={{amount_paise:3001,remaining_held_paise:6999,revision:"b".repeat(64)}} onSaved={saved} />);
  await userEvent.click(screen.getByText("Apply approved wallet refund"));
  expect(screen.getByText(/₹69.99 remains held for a separate decision/)).toBeTruthy();
  await userEvent.type(screen.getByLabelText("Execution reason"), "Apply independently approved partial refund");
  await userEvent.click(screen.getByText("Review execution"));
  expect(api).not.toHaveBeenCalled();
  await userEvent.click(screen.getByText("Confirm wallet refund"));
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(api).toHaveBeenCalledWith("/ride-cases/case/proposals/proposal/refund", expect.objectContaining({body:expect.objectContaining({financial_revision:"b".repeat(64)})}));
});

it('confirms the remainder allocation and retries an uncertain execution with the same identity',async()=>{
 const saved=vi.fn();vi.mocked(api).mockRejectedValueOnce(Error('Connection lost')).mockResolvedValueOnce({});
 render(<ProposalExecution {...props} financial={{amount_paise:6999,revision:'c'.repeat(64),allocation:{outcome:'settle_traveler',remaining_held_paise:6999,rider_refund_paise:0,traveler_payout_paise:5949,platform_fee_paise:1050}}} onSaved={saved}/>);
 await userEvent.click(screen.getByText('Apply approved remainder decision'));
 expect(screen.getByText('₹59.49')).toBeTruthy();expect(screen.getByText('₹10.50')).toBeTruthy();
 await userEvent.type(screen.getByLabelText('Execution reason'),'Apply independently approved remainder');
 await userEvent.click(screen.getByText('Review execution'));expect(api).not.toHaveBeenCalled();
 await userEvent.click(screen.getByText('Confirm remainder decision'));await screen.findByText('Connection lost');
 const first=vi.mocked(api).mock.calls[0][1];
 await userEvent.click(screen.getByText('Retry same remainder decision'));await waitFor(()=>expect(saved).toHaveBeenCalledOnce());
 expect(vi.mocked(api).mock.calls[1][1]).toEqual(first);
 expect(api).toHaveBeenCalledWith('/ride-cases/case/proposals/proposal/refund',expect.objectContaining({body:expect.objectContaining({financial_revision:'c'.repeat(64)})}));
});
