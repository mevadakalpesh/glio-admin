import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaymentInspection } from "./PaymentInspection";
import { api } from "./api";
const access = vi.hoisted(() => ({ allowed: true }));
vi.mock("./useAuth", () => ({
  useAuth: () => ({
    session: {
      csrf_token: "csrf",
      staff: {
        permissions: access.allowed ? ["payments.inspect"] : [],
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
async function inspect() {
  await userEvent.type(
    screen.getByLabelText("Reason for access"),
    "Investigate missing update",
  );
  await userEvent.click(screen.getByText("Inspect payment record"));
}
it("requires audited access and displays recorded evidence without resend controls", async () => {
  vi.mocked(api).mockResolvedValue({
    state: "pending",
    environment: "SANDBOX",
    refund_status: "not_recorded",
    settlement_status: "not_recorded",
    settlement_mode: "sandbox_checkout",
    amount: "38.00",
    refund_requested_at: "2026-10-18T01:00:00Z",
    refund_completed_at: null,
    check_evidence: {
      error_recorded: true,
      explanation: "Provider availability error recorded.",
      timestamp_status: "recorded",
      age_seconds: 120,
      notes: ["Not a successful check timestamp."],
    },
    refund_timeline: {
      status: "open",
      elapsed_seconds: 3600,
      notes: ["This is not a processing deadline."],
    },
    amount_evidence: {
      status: "review_required",
      notes: ["Recorded refund amount exceeds the order amount."],
    },
    local_consistency: {
      status: "review_required",
      notes: ["The order amount differs from the confirmed ride fare."],
    },
    notes: ["Cause is unclassified."],
    sent_at: null,
    delivered_at: null,
    read_at: null,
  });
  render(<PaymentInspection id="event" />);
  expect(api).not.toHaveBeenCalled();
  await inspect();
  await screen.findByText("Cause is unclassified.");
  expect(screen.getByText("Test payment")).toBeTruthy();
  expect(screen.getByText("₹38.00")).toBeTruthy();
  expect(screen.getByText("Amount review required")).toBeTruthy();
  expect(
    screen.getByText("Recorded refund amount exceeds the order amount."),
  ).toBeTruthy();
  expect(screen.getByText("Recorded elapsed time: 60 min")).toBeTruthy();
  expect(screen.getByText("This is not a processing deadline.")).toBeTruthy();
  expect(screen.getByText("Refund requested (IST)")).toBeTruthy();
  expect(screen.getByText("Refund completion recorded (IST)")).toBeTruthy();
  expect(screen.getByText(/6:30/)).toBeTruthy();
  expect(screen.getByText("Review required")).toBeTruthy();
  expect(screen.getByText("Check age at inspection: 2 min")).toBeTruthy();
  expect(screen.getByText("Not a successful check timestamp.")).toBeTruthy();
  expect(
    screen.getByText("The order amount differs from the confirmed ride fare."),
  ).toBeTruthy();
  expect(api).toHaveBeenCalledWith(
    "/payments/event/inspection",
    expect.objectContaining({ body: { reason: "Investigate missing update" } }),
  );
  expect(screen.queryByText("Resend")).toBeNull();
  await userEvent.click(screen.getByText("Hide payment details"));
  expect(screen.queryByText("Cause is unclassified.")).toBeNull();
});
it("ignores late cancelled results and enforces permission", async () => {
  let resolve!: (v: unknown) => void;
  vi.mocked(api).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const view = render(<PaymentInspection id="event" />);
  await inspect();
  await userEvent.click(screen.getByText("Cancel access"));
  resolve({
    state: "pending",
    environment: "SANDBOX",
    refund_status: "not_recorded",
    settlement_status: "not_recorded",
    settlement_mode: "sandbox_checkout",
    amount: "38.00",
    notes: ["Old result"],
  });
  await waitFor(() => expect(screen.queryByText("Old result")).toBeNull());
  view.unmount();
  access.allowed = false;
  render(<PaymentInspection id="event" />);
  expect(screen.queryByText("Payment record inspection")).toBeNull();
});
