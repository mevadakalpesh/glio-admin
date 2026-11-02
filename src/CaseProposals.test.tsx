import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CaseProposals } from "./CaseProposals";
import { api } from "./api";
const access = vi.hoisted(() => ({ allowed: true }));
vi.mock("./useAuth", () => ({
  useAuth: () => ({
    session: {
      csrf_token: "csrf",
      staff: {
        permissions: access.allowed
          ? ["cases.proposals.read", "cases.proposals.write", "cases.proposals.execute"]
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
const empty = {
  items: [],
  page: 1,
  page_size: 25,
  total: 0,
  revision: "a".repeat(64),
  can_propose: true,
};
const item = {
  id: "proposal",
  recommendation: "payment_review",
  rationale: "Review the recorded payment evidence.",
  status: "pending_review",
  by_you: true,
  context_changed: false,
  can_withdraw: true,
  created_at: "2026-10-18T00:00:00Z",
};
async function open() {
  await userEvent.click(screen.getByText("View proposals"));
  await screen.findByText("Refresh proposals");
}
it("loads only on open and requires review before submitting a recommendation", async () => {
  vi.mocked(api)
    .mockResolvedValueOnce(empty)
    .mockResolvedValueOnce({ item })
    .mockResolvedValueOnce({
      ...empty,
      items: [item],
      total: 1,
      can_propose: false,
    });
  render(<CaseProposals id="case" />);
  expect(api).not.toHaveBeenCalled();
  await open();
  await screen.findByText("No proposals recorded.");
  await userEvent.selectOptions(
    screen.getByLabelText("Recommendation"),
    "payment_review",
  );
  await userEvent.type(screen.getByLabelText("Rationale"), item.rationale);
  await userEvent.click(screen.getByText("Review proposal"));
  expect(api).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByText("Submit proposal"));
  await screen.findByText(
    "Proposal recorded. It has not been approved or applied.",
  );
  expect(api).toHaveBeenCalledWith(
    "/ride-cases/case/proposals",
    expect.objectContaining({
      method: "POST",
      csrf: "csrf",
      body: expect.objectContaining({
        recommendation: "payment_review",
        revision: empty.revision,
        rationale: item.rationale,
      }),
    }),
  );
});
it("network retry reuses the same submission ID", async () => {
  vi.mocked(api)
    .mockResolvedValueOnce(empty)
    .mockRejectedValueOnce(Error("Unavailable"))
    .mockResolvedValueOnce({ item })
    .mockResolvedValueOnce({ ...empty, items: [item], can_propose: false });
  render(<CaseProposals id="case" />);
  await open();
  await screen.findByLabelText("Rationale");
  await userEvent.type(screen.getByLabelText("Rationale"), item.rationale);
  await userEvent.click(screen.getByText("Review proposal"));
  await userEvent.click(screen.getByText("Submit proposal"));
  await screen.findByRole("alert");
  await userEvent.click(screen.getByText("Submit proposal"));
  await screen.findByText(
    "Proposal recorded. It has not been approved or applied.",
  );
  const writes = vi
    .mocked(api)
    .mock.calls.filter(([, opts]) => opts?.method === "POST");
  expect(writes).toHaveLength(2);
  expect(writes[0][1]?.body).toEqual(writes[1][1]?.body);
});
it("withdrawal requires reason and confirmation without resolving the case", async () => {
  vi.mocked(api)
    .mockResolvedValueOnce({ ...empty, items: [item], can_propose: false })
    .mockResolvedValueOnce({ item: { ...item, status: "withdrawn" } })
    .mockResolvedValueOnce({
      ...empty,
      items: [{ ...item, status: "withdrawn", can_withdraw: false }],
    });
  render(<CaseProposals id="case" />);
  await open();
  await userEvent.click(await screen.findByText("Withdraw proposal"));
  await userEvent.type(
    screen.getByLabelText("Withdrawal reason"),
    "New information needs review",
  );
  await userEvent.click(screen.getByText("Review withdrawal"));
  expect(api).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByText("Confirm withdrawal"));
  await screen.findByText("Proposal withdrawn.");
  expect(api).toHaveBeenCalledWith(
    "/ride-cases/case/proposals/proposal/withdraw",
    expect.objectContaining({
      body: { reason: "New information needs review" },
    }),
  );
});
it("does not expose proposals without permission", () => {
  access.allowed = false;
  render(<CaseProposals id="case" />);
  expect(api).not.toHaveBeenCalled();
  expect(screen.queryByText("View proposals")).toBeNull();
});
it("shows changed context and renders rationale as plain text", async () => {
  vi.mocked(api).mockResolvedValue({
    ...empty,
    items: [
      {
        ...item,
        context_changed: true,
        rationale: "<script>text only</script>",
      },
    ],
    can_propose: false,
  });
  render(<CaseProposals id="case" />);
  await open();
  await screen.findByText(/Case or assignment changed since/);
  expect(
    screen.getByText("<script>text only</script>").querySelector("script"),
  ).toBeNull();
  expect(screen.queryByText("Review proposal")).toBeNull();
});

it("refreshes proposal history and asks case details to reload after execution", async () => {
  const executed = vi.fn();
  vi.mocked(api)
    .mockResolvedValueOnce({
      ...empty,
      can_propose: false,
      items: [{ ...item, status: "approved", can_execute: true }],
    })
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({
      ...empty,
      items: [{ ...item, status: "executed", can_execute: false }],
    });
  render(<CaseProposals id="case" onExecuted={executed} />);
  await open();
  await userEvent.click(await screen.findByText("Apply further investigation"));
  await userEvent.type(
    screen.getByLabelText("Execution reason"),
    "Start follow-up evidence review.",
  );
  await userEvent.click(screen.getByText("Review execution"));
  await userEvent.click(screen.getByText("Confirm investigation"));
  await screen.findByText(
    "Further investigation execution recorded.",
  );
  expect(executed).toHaveBeenCalledOnce();
});

it('approved partial proposals show their remaining hold and do not expose refund execution',async()=>{vi.mocked(api).mockResolvedValue({...empty,items:[{...item,recommendation:'wallet_partial_refund',status:'approved',financial:{amount_paise:3001,remaining_held_paise:6999,currency:'INR',revision:'bound'},can_execute_refund:false}],total:1});render(<CaseProposals id="case"/>);await open();expect(await screen.findByText(/Partial wallet refund ·/)).toBeTruthy();expect(screen.getByText(/Remaining held: ₹69.99/)).toBeTruthy();expect(screen.queryByText('Execute refund')).toBeNull();});
