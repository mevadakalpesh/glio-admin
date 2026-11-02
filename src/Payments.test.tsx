import {addFilter} from "./filterTestHelpers";
import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Payments } from "./Payments";
import { useRead } from "./useRead";
const access = vi.hoisted(() => ({ allowed: true }));
vi.mock("./useAuth", () => ({
  useAuth: () => ({
    session: {
      staff: { permissions: access.allowed ? ["payments.read"] : [] },
    },
  }),
}));
vi.mock("./useRead", () => ({ useRead: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  access.allowed = true;
});
it("shows recorded test payment without treating pending as failed and preserves filters", async () => {
  vi.mocked(useRead).mockReturnValue({
    key: "payments",
    data: {
      items: [
        {
          id: "order",
          ride_id: "ride",
          state: "pending",
          environment: "SANDBOX",
          amount: "38.00",
          paid_at: null,
          checked_at: null,
          created_at: null,
        },
      ],
      total: 1,
      page: 1,
      page_size: 25,
      generated_at: "2026-10-18T00:00:00Z",
    },
  });
  render(
    <MemoryRouter initialEntries={["/?page=2&state=pending"]}>
      <Payments />
    </MemoryRouter>,
  );
  expect(screen.getByText("Test payment")).toBeTruthy();
  expect(screen.getByText("₹38.00")).toBeTruthy();
  expect(screen.queryByText("Refund payment")).toBeNull();
  await addFilter("Payment environment");
  await userEvent.selectOptions(
    screen.getByLabelText("Payment environment"),
    "SANDBOX",
  );
  expect(useRead).toHaveBeenLastCalledWith(
    "/payments?state=pending&environment=SANDBOX",
    0,
  );
  await userEvent.click(screen.getByText("Refresh records"));
  expect(useRead).toHaveBeenLastCalledWith(
    "/payments?state=pending&environment=SANDBOX",
    1,
  );
});
it("does not fetch without permission", () => {
  access.allowed = false;
  render(
    <MemoryRouter>
      <Payments />
    </MemoryRouter>,
  );
  expect(useRead).not.toHaveBeenCalled();
});
it("shows request failure and empty results explicitly", () => {
  vi.mocked(useRead).mockReturnValue({ key: "payments", error: "Unavailable" });
  const view = render(
    <MemoryRouter>
      <Payments />
    </MemoryRouter>,
  );
  expect(screen.getByRole("alert").textContent).toBe("Unavailable");
  view.unmount();
  vi.mocked(useRead).mockReturnValue({
    key: "payments",
    data: {
      items: [],
      total: 0,
      page: 1,
      page_size: 25,
      generated_at: "2026-10-18T00:00:00Z",
    },
  });
  render(
    <MemoryRouter>
      <Payments />
    </MemoryRouter>,
  );
  expect(
    screen.getByText("No payment records match these filters."),
  ).toBeTruthy();
});
it("searches by ride reference and clears it without dropping other filters", async () => {
  vi.mocked(useRead).mockReturnValue({
    key: "payments",
    data: {
      items: [],
      total: 0,
      page: 1,
      page_size: 25,
      generated_at: "2026-10-18T00:00:00Z",
    },
  });
  render(
    <MemoryRouter initialEntries={["/?page=4&state=paid&environment=SANDBOX"]}>
      <Payments />
    </MemoryRouter>,
  );
  await addFilter("Ride reference");
  await userEvent.type(screen.getByLabelText("Ride reference"), "r0002");
  await waitFor(()=>expect(useRead).toHaveBeenLastCalledWith("/payments?state=paid&environment=SANDBOX&reference=R0002",0),{timeout:3000});
  expect(useRead).toHaveBeenLastCalledWith(
    "/payments?state=paid&environment=SANDBOX&reference=R0002",
    0,
  );
  await waitFor(()=>expect((screen.getByLabelText("Ride reference") as HTMLInputElement).value).toBe("R0002"));
  await userEvent.clear(screen.getByLabelText("Ride reference"));
  await waitFor(()=>expect(useRead).toHaveBeenLastCalledWith("/payments?state=paid&environment=SANDBOX",0),{timeout:3000});
  expect(useRead).toHaveBeenLastCalledWith(
    "/payments?state=paid&environment=SANDBOX",
    0,
  );
});

it("applies India date basis while preserving ride and status filters", async () => {
  vi.mocked(useRead).mockReturnValue({
    key: "payments",
    data: {
      items: [],
      total: 0,
      page: 1,
      page_size: 25,
      generated_at: "2026-10-18T00:00:00Z",
    },
  });
  render(
    <MemoryRouter initialEntries={["/?page=3&state=paid&reference=R0002"]}>
      <Payments />
    </MemoryRouter>,
  );
  await addFilter("Date basis");
  await userEvent.selectOptions(screen.getByLabelText("Date basis"), "paid");
  const clock=vi.spyOn(Date,"now").mockReturnValue(Date.parse("2026-10-18T06:00:00Z"));
  await userEvent.click(screen.getByRole("button",{name:"Payment date range (IST)"}));
  await userEvent.click(screen.getByRole("button",{name:"Today"}));
  clock.mockRestore();
  expect(useRead).toHaveBeenLastCalledWith(
    "/payments?state=paid&reference=R0002&from=2026-10-18&to=2026-10-18&date_field=paid",
    0,
  );
  await userEvent.click(screen.getByRole("button",{name:"Payment date range (IST)"}));
  await userEvent.click(screen.getByRole("button",{name:"Clear dates"}));
  expect(useRead).toHaveBeenLastCalledWith(
    "/payments?state=paid&reference=R0002&date_field=paid",
    0,
  );
});

it("filters recorded errors without losing state or environment", async () => {
  vi.mocked(useRead).mockReturnValue({
    key: "payments",
    data: {
      items: [],
      total: 0,
      page: 1,
      page_size: 25,
      generated_at: "2026-10-18T00:00:00Z",
    },
  });
  render(
    <MemoryRouter initialEntries={["/?page=3&state=paid&environment=SANDBOX"]}>
      <Payments />
    </MemoryRouter>,
  );
  await addFilter("Recorded errors"); await userEvent.selectOptions(screen.getByLabelText("Recorded errors"), "recorded_error");
  expect(useRead).toHaveBeenLastCalledWith(
    "/payments?state=paid&environment=SANDBOX&issue=recorded_error",
    0,
  );
  expect(screen.getByText(/It does not mean payment failed/)).toBeTruthy();
  await userEvent.selectOptions(screen.getByLabelText("Recorded errors"), "");
  expect(useRead).toHaveBeenLastCalledWith(
    "/payments?state=paid&environment=SANDBOX",
    0,
  );
});

it("filters recorded refunds independently of paid state and resets pagination", async () => {
  vi.mocked(useRead).mockReturnValue({
    key: "payments",
    data: {
      items: [],
      total: 0,
      page: 1,
      page_size: 25,
      generated_at: "2026-10-18T00:00:00Z",
    },
  });
  render(
    <MemoryRouter initialEntries={["/?page=3&state=paid&environment=SANDBOX"]}>
      <Payments />
    </MemoryRouter>,
  );
  await addFilter("Recorded refund state");
  await userEvent.selectOptions(
    screen.getByLabelText("Recorded refund state"),
    "FAILED",
  );
  expect(useRead).toHaveBeenLastCalledWith(
    "/payments?state=paid&environment=SANDBOX&refund=FAILED",
    0,
  );
  await addFilter("Recorded refund state");
  await userEvent.selectOptions(
    screen.getByLabelText("Recorded refund state"),
    "",
  );
  expect(useRead).toHaveBeenLastCalledWith(
    "/payments?state=paid&environment=SANDBOX",
    0,
  );
});

it("uses refund dates independently and preserves refund filter", async () => {
  vi.mocked(useRead).mockReturnValue({
    key: "payments",
    data: {
      items: [],
      total: 0,
      page: 1,
      page_size: 25,
      generated_at: "2026-10-18T00:00:00Z",
    },
  });
  render(
    <MemoryRouter initialEntries={["/?page=4&refund=PENDING"]}>
      <Payments />
    </MemoryRouter>,
  );
  await addFilter("Date basis");
  await userEvent.selectOptions(
    screen.getByLabelText("Date basis"),
    "refund_requested",
  );
  const clock=vi.spyOn(Date,"now").mockReturnValue(Date.parse("2026-10-18T06:00:00Z"));
  await userEvent.click(screen.getByRole("button",{name:"Payment date range (IST)"}));
  await userEvent.click(screen.getByRole("button",{name:"Today"}));
  clock.mockRestore();
  expect(useRead).toHaveBeenLastCalledWith(
    "/payments?from=2026-10-18&to=2026-10-18&date_field=refund_requested&refund=PENDING",
    0,
  );
  await addFilter("Date basis");
  await userEvent.selectOptions(
    screen.getByLabelText("Date basis"),
    "refund_completed",
  );
  expect(useRead).toHaveBeenLastCalledWith(
    "/payments?from=2026-10-18&to=2026-10-18&date_field=refund_completed&refund=PENDING",
    0,
  );
});

it("filters approval-pending and rejected refunds", async () => {
  vi.mocked(useRead).mockReturnValue({key: "payments", data: {items: [], total: 0, page: 1, page_size: 25, generated_at: "2026-10-18T00:00:00Z"}});
  render(<MemoryRouter><Payments /></MemoryRouter>);
  for (const value of ["PENDING_APPROVAL", "REJECTED"]) {
    await addFilter("Recorded refund state");
  await userEvent.selectOptions(screen.getByLabelText("Recorded refund state"), value);
    expect(useRead).toHaveBeenLastCalledWith(`/payments?refund=${value}`, 0);
  }
});

it('offers read-only row actions without unauthorized payment inspection',async()=>{
 vi.mocked(useRead).mockReturnValue({key:'payments',data:{items:[{id:'order',ride_id:'ride',state:'pending',environment:'SANDBOX',amount:'38.00',paid_at:null,checked_at:null,created_at:null}],total:1,page:1,page_size:25,generated_at:'2026-10-18T00:00:00Z'}});
 render(<MemoryRouter><Payments/></MemoryRouter>);
 await userEvent.click(screen.getByRole('button',{name:'Actions for payment order'}));
 expect((await screen.findByRole('menuitem',{name:'View ride'})).getAttribute('href')).toBe('/trips?kind=rides&id=ride');
 expect(screen.queryByRole('menuitem',{name:'Inspect payment'})).toBeNull();
 await userEvent.keyboard('{Escape}');
 await userEvent.click(screen.getByRole('button',{name:'Columns'}));
 await userEvent.click(await screen.findByRole('checkbox',{name:'Created (IST)'}));
 expect(screen.queryByRole('columnheader',{name:'Created (IST)'})).toBeNull();
 expect(screen.getByText('₹38.00')).toBeTruthy();
});
