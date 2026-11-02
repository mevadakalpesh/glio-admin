import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CreationTrend } from "./OverviewDashboard";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const response = (data: unknown, status = 200) =>
  new Response(
    JSON.stringify(
      status === 200
        ? { success: true, data }
        : { success: false, message: data },
    ),
    { status, headers: { "Content-Type": "application/json" } },
  );
it("loads actual creation counts for the selected region and refreshes them", async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(async () =>
      response({ daily: [{ date: "2026-10-28", trips: 3, rides: 2 }] }),
    );
  vi.stubGlobal("fetch", fetcher);
  const view = render(
    <MemoryRouter>
      <CreationTrend state="GJ" version={0} />
    </MemoryRouter>,
  );
  await screen.findByText("View daily counts");
  expect(screen.getByText("2026-10-28")).toBeTruthy();
  const url = new URL(String(fetcher.mock.calls[0][0]), "http://localhost");
  expect(url.searchParams.get("state")).toBe("GJ");
  expect(
    (Date.parse(url.searchParams.get("to")!) -
      Date.parse(url.searchParams.get("from")!)) /
      86400000,
  ).toBe(29);
  view.rerender(
    <MemoryRouter>
      <CreationTrend state="GJ" version={1} />
    </MemoryRouter>,
  );
  await screen.findByText("View daily counts");
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("shows a chart failure without presenting it as zero activity", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(response("Reports unavailable", 503)),
  );
  render(<CreationTrend state="" version={0} />);
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByText("No journeys created in this period.")).toBeNull();
});
it("shows an honest empty state for a successful empty report", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ daily: [] })));
  render(<CreationTrend state="" version={0} />);
  expect(
    await screen.findByText("No journeys created in this period."),
  ).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
});
