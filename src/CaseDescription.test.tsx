import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CaseDescription } from "./CaseDescription";
import { api } from "./api";
const access = vi.hoisted(() => ({ allowed: true }));
vi.mock("./useAuth", () => ({
  useAuth: () => ({
    session: {
      csrf_token: "csrf",
      staff: { permissions: access.allowed ? ["cases.description.read"] : [] },
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
    description: "<script>private statement</script>",
    truncated: false,
  });
  render(<CaseDescription id="case" />);
  expect(api).not.toHaveBeenCalled();
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText("Reason for access"),
    "Review rider concern",
  );
  await user.click(screen.getByRole("button", { name: "View description" }));
  expect(
    await screen.findByText("<script>private statement</script>"),
  ).toBeTruthy();
  expect(document.querySelector("script")).toBeNull();
  expect(api).toHaveBeenCalledWith(
    "/ride-cases/case/description",
    expect.objectContaining({
      method: "POST",
      csrf: "csrf",
      body: { reason: "Review rider concern" },
    }),
  );
  await user.click(screen.getByRole("button", { name: "Hide description" }));
  expect(screen.queryByText("<script>private statement</script>")).toBeNull();
});
it("does not expose the control without restricted permission", () => {
  access.allowed = false;
  render(<CaseDescription id="case" />);
  expect(screen.queryByRole("button")).toBeNull();
  expect(api).not.toHaveBeenCalled();
});
it("shows access failures without revealing a statement", async () => {
  vi.mocked(api).mockRejectedValue(Error("Access unavailable"));
  render(<CaseDescription id="case" />);
  await userEvent.type(
    screen.getByLabelText("Reason for access"),
    "Review details",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "View description" }),
  );
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
  render(<CaseDescription id="case" />);
  await userEvent.type(
    screen.getByLabelText("Reason for access"),
    "Review details",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "View description" }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Cancel access" }));
  resolve({ description: "late private content", truncated: false });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "View description" }),
    ).toBeTruthy(),
  );
  expect(screen.queryByText("late private content")).toBeNull();
});
