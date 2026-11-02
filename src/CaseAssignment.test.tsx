import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CaseAssignment } from "./CaseAssignment";
import { api } from "./api";
const authState = vi.hoisted(() => ({ permissions: ["cases.assign"] }));
vi.mock("./useAuth", () => ({
  useAuth: () => ({
    session: { csrf_token: "csrf", staff: { permissions: authState.permissions } },
  }),
}));
vi.mock("./api", () => ({ api: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  authState.permissions = ["cases.assign"];
});
const free = {
  version: 0,
  assigned: false,
  assigned_to_me: false,
  can_claim: true,
};
it("requires review before assigning and refreshes after success", async () => {
  vi.mocked(api)
    .mockResolvedValueOnce(free)
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({
      version: 1,
      assigned: true,
      assigned_to_me: true,
      can_claim: false,
    });
  render(<CaseAssignment id="case" />);
  await screen.findByText("Unassigned");
  await userEvent.type(
    screen.getByLabelText("Assignment reason"),
    "Review rider issue",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Review assignment" }),
  );
  expect(api).toHaveBeenCalledTimes(1);
  await userEvent.click(
    screen.getByRole("button", { name: "Confirm assignment change" }),
  );
  await screen.findByText("Assigned to you");
  expect(api).toHaveBeenCalledWith(
    "/ride-cases/case/assignment",
    expect.objectContaining({
      method: "POST",
      body: { action: "claim", version: 0, reason: "Review rider issue" },
    }),
  );
});
it("a conflict refreshes the assignment and never reports success", async () => {
  vi.mocked(api)
    .mockResolvedValueOnce(free)
    .mockRejectedValueOnce(Error("Assignment changed."))
    .mockResolvedValueOnce({ ...free, assigned: true, can_claim: false });
  render(<CaseAssignment id="case" />);
  await screen.findByText("Unassigned");
  await userEvent.type(
    screen.getByLabelText("Assignment reason"),
    "Review rider issue",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Review assignment" }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Confirm assignment change" }),
  );
  expect((await screen.findByRole("alert")).textContent).toBe(
    "Assignment changed.",
  );
  await screen.findByText("Assigned to another staff member");
  expect(screen.queryByText("Case assigned to you.")).toBeNull();
});
it("read failures stay visible and can be refreshed", async () => {
  vi.mocked(api)
    .mockRejectedValueOnce(Error("Unavailable"))
    .mockResolvedValueOnce(free);
  render(<CaseAssignment id="case" />);
  await screen.findByRole("alert");
  await userEvent.click(
    screen.getByRole("button", { name: "Refresh assignment" }),
  );
  await waitFor(() => expect(screen.getByText("Unassigned")).toBeTruthy());
});

it("requires confirmation to recover an inactive assignment and refreshes the result", async () => {
  vi.mocked(api).mockResolvedValueOnce({...free, version:3, assigned:true, can_claim:false, can_recover:true})
    .mockResolvedValueOnce({}).mockResolvedValueOnce({...free, version:4});
  render(<CaseAssignment id="case" />);
  await screen.findByText("Assigned to an inactive staff member");
  await userEvent.type(screen.getByLabelText("Assignment reason"), "Recover departed staff workload");
  await userEvent.click(screen.getByRole("button", {name:"Review recovery"}));
  expect(api).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole("button", {name:"Confirm assignment change"}));
  await screen.findByText("Unassigned");
  expect(api).toHaveBeenCalledWith("/ride-cases/case/assignment", expect.objectContaining({method:"POST", body:{action:"recover",version:3,reason:"Recover departed staff workload"}}));
});
it("does not offer recovery of an active staff assignment", async () => {
  vi.mocked(api).mockResolvedValue({...free, assigned:true, can_claim:false, can_recover:false});
  render(<CaseAssignment id="case" />);
  await screen.findByText("Assigned to another staff member");
  expect(screen.queryByRole("button", {name:"Review recovery"})).toBeNull();
});

it("read-only case staff do not request assignment data or see assignment controls", () => {
  authState.permissions = ["cases.read", "cases.description.read"];
  const { container } = render(<CaseAssignment id="case" />);
  expect(container.innerHTML).toBe("");
  expect(api).not.toHaveBeenCalled();
});
