import {addFilter} from './filterTestHelpers';
import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { NotificationDelivery } from "./NotificationDelivery";
import { useRead } from "./useRead";
const access = vi.hoisted(() => ({ allowed: true }));
vi.mock("./useAuth", () => ({
  useAuth: () => ({
    session: {
      staff: {
        permissions: access.allowed ? ["notifications.delivery.read"] : [],
      },
    },
  }),
}));
vi.mock("./useRead", () => ({ useRead: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  access.allowed = true;
});
const result = {
  key: "delivery",
  data: {
    items: [
      {
        id: "event",
        entity_type: "ride_request",
        entity_id: "ride",
        status: "sent",
        created_at: "2026-10-18T00:00:00Z",
        updated_at: null,
        sent_at: null,
        delivered_at: null,
        read_at: null,
      },
    ],
    page: 1,
    page_size: 25,
    total: 1,
    generated_at: "2026-10-18T00:00:00Z",
  },
};
it("shows recorded evidence without claiming delivery and resets page on filter change", async () => {
  vi.mocked(useRead).mockReturnValue(result);
  render(
    <MemoryRouter initialEntries={["/?page=2"]}>
      <NotificationDelivery />
    </MemoryRouter>,
  );
  expect(screen.getByText(/Sent does not prove device delivery/)).toBeTruthy();
  expect(screen.getByText("View ride").getAttribute("href")).toContain(
    "kind=rides",
  );
  await addFilter("Recorded status");
  await userEvent.selectOptions(
    screen.getByLabelText("Recorded status"),
    "failed",
  );
  expect(useRead).toHaveBeenLastCalledWith(
    "/notification-delivery?status=failed",
    0,
  );
  await userEvent.click(screen.getByText("Refresh delivery"));
  expect(useRead).toHaveBeenLastCalledWith(
    "/notification-delivery?status=failed",
    1,
  );
});
it("does not fetch without permission and displays request failures", () => {
  access.allowed = false;
  const view = render(
    <MemoryRouter>
      <NotificationDelivery />
    </MemoryRouter>,
  );
  expect(useRead).not.toHaveBeenCalled();
  view.unmount();
  access.allowed = true;
  vi.mocked(useRead).mockReturnValue({ key: "delivery", error: "Unavailable" });
  render(
    <MemoryRouter>
      <NotificationDelivery />
    </MemoryRouter>,
  );
  expect(screen.getByRole("alert").textContent).toBe("Unavailable");
});

it("searches by reference while keeping status and resets pagination", async () => {
  vi.mocked(useRead).mockReturnValue(result);
  render(
    <MemoryRouter initialEntries={["/?page=3&status=failed"]}>
      <NotificationDelivery />
    </MemoryRouter>,
  );
  await addFilter("Ride or trip reference");
  await userEvent.type(
    screen.getByLabelText("Ride or trip reference"),
    "r0002",
  );
  await waitFor(()=>expect(useRead).toHaveBeenLastCalledWith("/notification-delivery?status=failed&reference=R0002",0));
  expect(useRead).toHaveBeenLastCalledWith(
    "/notification-delivery?status=failed&reference=R0002",
    0,
  );
  await userEvent.click(screen.getByRole("button",{name:"Remove Ride or trip reference filter"}));
  expect(useRead).toHaveBeenLastCalledWith(
    "/notification-delivery?status=failed",
    0,
  );
});

it("applies and clears India date bounds without losing journey or status filters", async () => {
  vi.mocked(useRead).mockReturnValue(result);
  render(
    <MemoryRouter initialEntries={["/?page=3&status=failed&reference=R0002"]}>
      <NotificationDelivery />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole('button',{name:'Notification date range (IST)'}));
  await userEvent.click(screen.getByRole('button',{name:'Today'}));
  expect(useRead).toHaveBeenLastCalledWith(expect.stringMatching(/status=failed&reference=R0002&from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/),0);
  await userEvent.click(screen.getByRole('button',{name:'Clear all filters'}));
  expect(useRead).toHaveBeenLastCalledWith('/notification-delivery?',0);
});

it("allows staff to filter skipped pushes", async () => {
  vi.mocked(useRead).mockReturnValue(result);
  render(<MemoryRouter><NotificationDelivery /></MemoryRouter>);
  await addFilter("Recorded status");
  await userEvent.selectOptions(screen.getByLabelText("Recorded status"), "skipped");
  expect(useRead).toHaveBeenLastCalledWith("/notification-delivery?status=skipped", 0);
});

it("filters retry-eligible events while preserving status and dates and resetting pagination", async () => {
  vi.mocked(useRead).mockReturnValue(result);
  render(<MemoryRouter initialEntries={["/?page=3&status=failed&from=2026-10-18"]}><NotificationDelivery /></MemoryRouter>);
  await addFilter("Retry state");
  await userEvent.selectOptions(screen.getByLabelText("Retry state"),"eligible");
  expect(useRead).toHaveBeenLastCalledWith("/notification-delivery?status=failed&from=2026-10-18&retry=eligible", 0);
  await userEvent.click(screen.getByRole("button",{name:"Remove Retry state filter"}));
  expect(useRead).toHaveBeenLastCalledWith("/notification-delivery?status=failed&from=2026-10-18", 0);
});

it('keeps reset hidden without filters and shows the compact empty state',()=>{
 vi.mocked(useRead).mockReturnValue({...result,data:{...result.data,items:[],total:0}});
 render(<MemoryRouter><NotificationDelivery/></MemoryRouter>);
 expect(screen.queryByRole('button',{name:'Clear all filters'})).toBeNull();
 expect(screen.getByRole('button',{name:'Filters'})).toBeTruthy();
 expect(screen.getByRole('button',{name:'Columns'})).toBeTruthy();
 expect(screen.getByText('No matching notification records.')).toBeTruthy();
 expect(screen.queryByRole('button',{name:'Find notifications'})).toBeNull();
 expect(screen.queryByRole('button',{name:'Actions for notification event'})).toBeNull();
});
