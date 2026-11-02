import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CaseFinancialReview } from "./CaseFinancialReview";
import { api } from "./api";
const access = vi.hoisted(() => ({ allowed: true }));
vi.mock("./useAuth", () => ({
  useAuth: () => ({
    session: {
      csrf_token: "csrf",
      staff: {
        permissions: access.allowed ? ["cases.financial-review.read"] : [],
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
const result = {
  items: [{ label: "Recorded ride fare", value: "₹100.00", type: "text" }],
  page: 1,
  page_size: 10,
  total: 11,
  viewed_at: "2026-10-18T00:00:00Z",
};
async function reveal() {
  await userEvent.type(
    screen.getByLabelText("Financial review reason"),
    "Review payment dispute",
  );
  await userEvent.click(screen.getByText("View financial review"));
}
it("requires reason, paginates with audited context and clears on hide", async () => {
  vi.mocked(api)
    .mockResolvedValueOnce(result)
    .mockResolvedValueOnce({ ...result, page: 2 });
  render(<CaseFinancialReview id="case" />);
  expect(api).not.toHaveBeenCalled();
  await reveal();
  await screen.findByText("₹100.00");
  await userEvent.click(screen.getByText("Next payment records"));
  await waitFor(() =>
    expect(api).toHaveBeenLastCalledWith(
      "/ride-cases/case/financial-review",
      expect.objectContaining({
        method: "POST",
        csrf: "csrf",
        body: { reason: "Review payment dispute", page: 2 },
      }),
    ),
  );
  await screen.findByText("Page 2");
  await userEvent.click(screen.getByText("Hide financial review"));
  expect(screen.queryByText("₹100.00")).toBeNull();
  expect(screen.getByLabelText("Financial review reason")).toHaveProperty(
    "value",
    "",
  );
});
it("ignores a late response after cancellation", async () => {
  let resolve!: (value: unknown) => void;
  vi.mocked(api).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  render(<CaseFinancialReview id="case" />);
  await reveal();
  await userEvent.click(screen.getByText("Cancel financial review"));
  resolve(result);
  await waitFor(() =>
    expect(screen.getByText("View financial review")).toBeTruthy(),
  );
  expect(screen.queryByText("₹100.00")).toBeNull();
});
it("does not fetch without financial-review permission", () => {
  access.allowed = false;
  render(<CaseFinancialReview id="case" />);
  expect(api).not.toHaveBeenCalled();
  expect(screen.queryByText("Financial review")).toBeNull();
});
it("allows retry after failure and distinguishes no provider attempts from unpaid", async () => {
  vi.mocked(api)
    .mockRejectedValueOnce(Error("Unavailable"))
    .mockResolvedValueOnce({ ...result, items: [], total: 0 });
  render(<CaseFinancialReview id="case" />);
  await reveal();
  await screen.findByRole("alert");
  await userEvent.click(screen.getByText("View financial review"));
  await screen.findByText(
    /This alone does not establish whether the ride was paid/,
  );
});
