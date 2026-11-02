import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CaseEvidence } from "./CaseEvidence";
import { api } from "./api";
const access = vi.hoisted(() => ({ allowed: true }));
vi.mock("./useAuth", () => ({
  useAuth: () => ({
    session: {
      csrf_token: "csrf",
      staff: { permissions: access.allowed ? ["cases.evidence.read"] : [] },
    },
  }),
}));
vi.mock("./api", () => ({ api: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  access.allowed = true;
});
it("requires an explicit request, renders statement as text and hides it", async () => {
  vi.mocked(api).mockResolvedValue({
    items: [
      {
        key: "ride_status",
        label: "Recorded ride state",
        value: "<script>private statement</script>",
        type: "text",
      },
    ],
    viewed_at: "2026-10-18T00:00:00Z",
  });
  render(<CaseEvidence id="case" />);
  expect(api).not.toHaveBeenCalled();
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText("Reason for evidence access"),
    "Review rider concern",
  );
  await user.click(screen.getByRole("button", { name: "View evidence" }));
  expect(
    await screen.findByText("<script>private statement</script>"),
  ).toBeTruthy();
  expect(document.querySelector("script")).toBeNull();
  expect(api).toHaveBeenCalledWith(
    "/ride-cases/case/evidence",
    expect.objectContaining({
      method: "POST",
      csrf: "csrf",
      body: { reason: "Review rider concern" },
    }),
  );
  await user.click(screen.getByRole("button", { name: "Hide evidence" }));
  expect(screen.queryByText("<script>private statement</script>")).toBeNull();
});
it("does not expose the control without restricted permission", () => {
  access.allowed = false;
  render(<CaseEvidence id="case" />);
  expect(screen.queryByRole("button")).toBeNull();
  expect(api).not.toHaveBeenCalled();
});
it("shows access failures without revealing a statement", async () => {
  vi.mocked(api).mockRejectedValue(Error("Access unavailable"));
  render(<CaseEvidence id="case" />);
  await userEvent.type(
    screen.getByLabelText("Reason for evidence access"),
    "Review details",
  );
  await userEvent.click(screen.getByRole("button", { name: "View evidence" }));
  expect((await screen.findByRole("alert")).textContent).toBe(
    "Access unavailable",
  );
});
it("cancelled access ignores a late response", async () => {
  let resolve!: (value: unknown) => void;
  vi.mocked(api).mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  render(<CaseEvidence id="case" />);
  await userEvent.type(
    screen.getByLabelText("Reason for evidence access"),
    "Review details",
  );
  await userEvent.click(screen.getByRole("button", { name: "View evidence" }));
  await userEvent.click(screen.getByRole("button", { name: "Cancel access" }));
  resolve({
    items: [
      {
        key: "late",
        label: "Late",
        value: "late private content",
        type: "text",
      },
    ],
    viewed_at: "2026-10-18T00:00:00Z",
  });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "View evidence" })).toBeTruthy(),
  );
  expect(screen.queryByText("late private content")).toBeNull();
});
