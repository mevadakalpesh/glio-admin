import {addFilter} from "./filterTestHelpers";
import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Catalog } from "./Catalog";
import { AuthContext } from "./useAuth";
import type { Auth } from "./authTypes";
import { api } from "./api";
vi.mock("./api", () => ({ api: vi.fn() }));
function setup(allowed = true, url = "/master-data") {
  const auth: Auth = {
    session: {
      staff: {
        id: "owner",
        name: "Owner",
        email: "test@example.test",
        role: "owner",
        active: true,
        mfa_enabled: true,
        permissions: allowed ? ["master-data.read"] : [],
      },
      csrf_token: "csrf",
    },
    loading: false,
    unavailable: "",
    recovery: [],
    accept: vi.fn(),
    reload: vi.fn(),
    logout: vi.fn(),
    acknowledgeRecovery: vi.fn(),
  };
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[url]}>
        <Catalog />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}
const vehicle = {
  id: 1,
  key: "bike",
  label: "Bike",
  max_seats: 0,
  is_active: false,
  sort_order: 0,
  has_icon: false,
  updated_at: "2026-10-18T04:30:00Z",
};
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("does not request catalogs for unauthorized staff", () => {
  setup(false);
  expect(
    screen.getByText("Your role does not include access to this module."),
  ).toBeTruthy();
  expect(api).not.toHaveBeenCalled();
});
it("shows zero capacity, inactive state and timestamps without editing controls", async () => {
  vi.mocked(api).mockResolvedValue({ items: [vehicle], total: 1, page: 1 });
  setup();
  await screen.findByText("Bike");
  expect(screen.getByText("No passenger capacity")).toBeTruthy();
  expect(screen.getByText("Inactive", { selector: "span" })).toBeTruthy();
  expect(screen.getByText(/10:00/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
});
it("applies filters, resets pages on category changes and preserves stored decimal percentages", async () => {
  vi.mocked(api).mockImplementation(async (path) =>
    path.startsWith("/catalog/luggage")
      ? {
          items: [
            {
              id: 2,
              key: "large",
              label: "Large luggage",
              surcharge_percent: "12.50",
              is_active: true,
              sort_order: 0,
              has_icon: true,
              updated_at: null,
            },
          ],
          total: 1,
          page: 1,
        }
      : { items: [vehicle], total: 30, page: 2 },
  );
  setup(true, "/master-data?page=2");
  const user = userEvent.setup();
  await screen.findByText("Bike");
  await addFilter("Search label or key");
  await user.type(screen.getByLabelText("Search label or key"), "bike");
  await addFilter("Status");
  await user.selectOptions(screen.getByLabelText("Status"), "inactive");

  await waitFor(() =>
    expect(api).toHaveBeenCalledWith(
      "/catalog/vehicles?page=1&state=inactive&search=bike",
      expect.anything(),
    ),
  );
  await user.click(screen.getByRole("button", { name: "Luggage options" }));
  await screen.findByText("12.50%");
  expect(api).toHaveBeenLastCalledWith(
    "/catalog/luggage?page=1",
    expect.anything(),
  );
});
it("reports read failures and allows retry; unknown catalogs make no request", async () => {
  vi.mocked(api)
    .mockRejectedValueOnce(new Error("Catalog unavailable"))
    .mockResolvedValue({ items: [], total: 0, page: 1 });
  setup();
  await screen.findByRole("alert");
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Refresh catalog" }));
  await screen.findByText("No options match these filters.");
  cleanup();
  vi.mocked(api).mockClear();
  setup(true, "/master-data?kind=unknown");
  expect(screen.getByRole("alert").textContent).toContain("not available");
  expect(api).not.toHaveBeenCalled();
});
it('opens history from the row menu in a modal and preserves read-only actions', async () => {
 vi.mocked(api).mockImplementation(async path => path.includes('/history') ? {items:[],has_more:false} : {items:[vehicle],total:1,page:1});
 setup(); const user=userEvent.setup();
 await user.click(await screen.findByRole('button',{name:'Actions for Bike'}));
 expect(screen.queryByRole('menuitem',{name:'Edit Bike'})).toBeNull();
 expect(screen.queryByRole('button',{name:'Add vehicle type'})).toBeNull();
 await user.click(await screen.findByRole('menuitem',{name:'History of Bike'}));
 expect(await screen.findByRole('dialog')).toBeTruthy();
 await screen.findByText(/No recorded admin changes/);
 await user.click(screen.getByRole('button',{name:'Close dialog'}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
 expect(api).toHaveBeenCalledWith('/catalog/vehicles/1/history?page=1',expect.anything());
});
