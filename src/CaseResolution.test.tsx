import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CaseResolution } from "./CaseResolution";
import { api } from "./api";
const access = vi.hoisted(() => ({ allowed: true }));
vi.mock("./useAuth", () => ({
  useAuth: () => ({
    session: {
      csrf_token: "csrf",
      staff: { permissions: access.allowed ? ["cases.resolution.read"] : [] },
    },
  }),
}));
vi.mock("./api", () => ({ api: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  access.allowed = true;
});
it("requires reason before revealing the recorded outcome and supports hiding it", async () => {
  vi.mocked(api).mockResolvedValue({
    recorded: true,
    outcome: "Closed without additional financial adjustment",
    basis: "No recorded payment evidence",
    reason: "Reviewed cancellation",
    resolved_at: "2026-10-18T00:00:00Z",
    by_you: true,
    truncated: false,
  });
  render(<CaseResolution id="case" />);
  expect(api).not.toHaveBeenCalled();
  await userEvent.type(
    screen.getByLabelText("Reason for access"),
    "Review previous outcome",
  );
  await userEvent.click(screen.getByText("View resolution"));
  await screen.findByText("Reviewed cancellation");
  expect(screen.getByText("No recorded payment evidence")).toBeTruthy();
  expect(api).toHaveBeenCalledWith(
    "/ride-cases/case/resolution",
    expect.objectContaining({ body: { reason: "Review previous outcome" } }),
  );
  await userEvent.click(screen.getByText("Hide resolution"));
  expect(screen.queryByText("Reviewed cancellation")).toBeNull();
});
it("requires the resolution permission", () => {
  access.allowed = false;
  render(<CaseResolution id="case" />);
  expect(screen.queryByText("Recorded case resolution")).toBeNull();
});
