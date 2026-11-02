import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationInspection } from "./NotificationInspection";
import { api } from "./api";
const access = vi.hoisted(() => ({ allowed: true }));
vi.mock("./useAuth", () => ({
  useAuth: () => ({
    session: {
      csrf_token: "csrf",
      staff: {
        permissions: access.allowed ? ["notifications.delivery.inspect"] : [],
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
  await userEvent.click(screen.getByText("Inspect delivery"));
}
it("requires audited access and displays recorded evidence without resend controls", async () => {
  vi.mocked(api).mockResolvedValue({
    status: "failed",
    notes: ["Cause is unclassified."],
    sent_at: null,
    delivered_at: null,
    read_at: null,
  });
  render(<NotificationInspection id="event" />);
  expect(api).not.toHaveBeenCalled();
  await inspect();
  await screen.findByText("Cause is unclassified.");
  expect(api).toHaveBeenCalledWith(
    "/notification-delivery/event/inspection",
    expect.objectContaining({ body: { reason: "Investigate missing update" } }),
  );
  expect(screen.queryByText("Resend")).toBeNull();
  await userEvent.click(screen.getByText("Hide inspection"));
  expect(screen.queryByText("Cause is unclassified.")).toBeNull();
});
it("ignores late cancelled results and enforces permission", async () => {
  let resolve!: (v: unknown) => void;
  vi.mocked(api).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const view = render(<NotificationInspection id="event" />);
  await inspect();
  await userEvent.click(screen.getByText("Cancel access"));
  resolve({ status: "failed", notes: ["Old result"] });
  await waitFor(() => expect(screen.queryByText("Old result")).toBeNull());
  view.unmount();
  access.allowed = false;
  render(<NotificationInspection id="event" />);
  expect(screen.queryByText("Notification inspection")).toBeNull();
});

it("shows retry eligibility and search enqueue without claiming matching success", async () => {
  vi.mocked(api).mockResolvedValue({status: "failed", automatic_retry_eligible: true, search_restart: "enqueued", search_enqueued_at: "2026-10-18T01:00:00Z", notes: ["Matching completion is not established."]});
  render(<NotificationInspection id="event" />);
  await inspect();
  expect(await screen.findByText("Eligible for worker retry")).toBeTruthy();
  expect(screen.getByText("Enqueue recorded")).toBeTruthy();
  expect(screen.getByText(/6:30/)).toBeTruthy();
  expect(screen.queryByText("Resend")).toBeNull();
});
