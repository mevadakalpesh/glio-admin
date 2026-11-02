import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CatalogUsage } from "./CatalogUsage";
import { api } from "./api";
vi.mock("./api", () => ({ api: vi.fn() }));
const snapshot = {
  record: { id: 1, label: "Bike", is_active: true },
  groups: [
    {
      key: "trips",
      title: "Trips",
      total: 2,
      statuses: [{ status: 999, label: "UNKNOWN", count: 2 }],
    },
    { key: "requests", title: "Requests", total: 0, statuses: [] },
  ],
  generated_at: "2026-10-18T04:30:00Z",
  scope: "Groups can overlap.",
};
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("shows independent status groups, unknown statuses and zero references with scope limitations", async () => {
  vi.mocked(api).mockResolvedValue(snapshot);
  render(<CatalogUsage kind="vehicles" id={1} onClose={vi.fn()} />);
  await screen.findByText("Catalog usage · Bike");
  expect(screen.getByText("Unknown status (999)")).toBeTruthy();
  expect(screen.getByText("No stored references in this group.")).toBeTruthy();
  expect(screen.getByText("Groups can overlap.")).toBeTruthy();
  expect(
    screen.getByText(/“Any vehicle” requests are not included/),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Deactivate" })).toBeNull();
});
it("reports errors, retries reads and closes without mutation requests", async () => {
  const close = vi.fn();
  vi.mocked(api)
    .mockRejectedValueOnce(new Error("Usage unavailable"))
    .mockResolvedValue(snapshot);
  render(<CatalogUsage kind="luggage" id={1} onClose={close} />);
  await screen.findByRole("alert");
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Refresh usage" }));
  await screen.findByText("Catalog usage · Bike");
  await user.click(screen.getByRole("button", { name: "Close usage" }));
  expect(close).toHaveBeenCalledOnce();
  expect(api).toHaveBeenCalledTimes(2);
  expect(api).toHaveBeenLastCalledWith(
    "/catalog/luggage/1/usage",
    expect.objectContaining({ signal: expect.anything() }),
  );
});
