import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthContext } from "./useAuth";
import type { Auth } from "./authTypes";
import { CatalogEditor } from "./CatalogEditor";
import { api } from "./api";
vi.mock("./api", () => ({ api: vi.fn() }));
function setup(kind: "vehicles" | "luggage" = "vehicles") {
  const auth: Auth = {
    session: {
      staff: {
        id: "owner",
        name: "Owner",
        email: "test@example.test",
        role: "owner",
        active: true,
        mfa_enabled: true,
        permissions: ["master-data.write"],
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
  const onClose = vi.fn(),
    onSaved = vi.fn();
  render(
    <AuthContext.Provider value={auth}>
      <CatalogEditor
        kind={kind}
        item={{
          id: 1,
          label: "Bike",
          sort_order: 0,
          revision: "revision",
          is_active: true,
        }}
        onClose={onClose}
        onSaved={onSaved}
      />
    </AuthContext.Provider>,
  );
  return { onClose, onSaved };
}
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const preview = {
  before: { label: "Bike" },
  after: { label: "Motorbike" },
  changes: { label: "Motorbike" },
  reason: "Improve customer label",
  preview_token: "signed",
};
async function fill() {
  const user = userEvent.setup();
  await user.clear(screen.getByLabelText("Label"));
  await user.type(screen.getByLabelText("Label"), "Motorbike");
  await user.type(
    screen.getByLabelText("Reason for change"),
    "Improve customer label",
  );
  await user.click(screen.getByRole("button", { name: "Review changes" }));
  return user;
}
it("requires a preview then sends only its signed token when confirmed", async () => {
  const callbacks = setup();
  vi.mocked(api)
    .mockResolvedValueOnce(preview)
    .mockResolvedValueOnce({ item: { label: "Motorbike" } });
  const user = await fill();
  await screen.findByRole("button", { name: "Confirm changes" });
  expect(callbacks.onSaved).not.toHaveBeenCalled();
  expect(api).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: "Confirm changes" }));
  await waitFor(() => expect(callbacks.onSaved).toHaveBeenCalledTimes(1));
  expect(api).toHaveBeenLastCalledWith("/catalog/vehicles/1/apply", {
    method: "POST",
    csrf: "csrf",
    body: { preview_token: "signed" },
  });
});
it("keeps conflicts visible without reporting a successful update", async () => {
  const callbacks = setup();
  vi.mocked(api)
    .mockResolvedValueOnce(preview)
    .mockRejectedValueOnce(
      new Error("Record changed. Refresh and review again."),
    );
  const user = await fill();
  await user.click(
    await screen.findByRole("button", { name: "Confirm changes" }),
  );
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Record changed",
  );
  expect(callbacks.onSaved).not.toHaveBeenCalled();
});
it("back-to-edit retains the draft and cancellation does not apply it", async () => {
  const callbacks = setup();
  vi.mocked(api).mockResolvedValue(preview);
  const user = await fill();
  await user.click(await screen.findByRole("button", { name: "Back to edit" }));
  expect((screen.getByLabelText("Label") as HTMLInputElement).value).toBe(
    "Motorbike",
  );
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(callbacks.onClose).toHaveBeenCalledTimes(1);
  expect(api).toHaveBeenCalledTimes(1);
});

it("previews luggage deactivation explicitly and retains the choice when returning to edit", async () => {
  setup("luggage");
  vi.mocked(api).mockResolvedValueOnce({
    before: { is_active: true },
    after: { is_active: false },
    changes: { is_active: false },
    reason: "Retire luggage option",
    preview_token: "signed-status",
  });
  const user = userEvent.setup();
  await user.selectOptions(screen.getByLabelText("Availability"), "inactive");
  await user.type(
    screen.getByLabelText("Reason for change"),
    "Retire luggage option",
  );
  await user.click(screen.getByRole("button", { name: "Review changes" }));
  await screen.findByRole("button", { name: "Confirm changes" });
  expect(api).toHaveBeenCalledWith(
    "/catalog/luggage/1/preview",
    expect.objectContaining({
      body: expect.objectContaining({
        changes: expect.objectContaining({ is_active: false }),
      }),
    }),
  );
  expect(screen.getByText(/Active → Inactive/)).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Back to edit" }));
  expect(
    (screen.getByLabelText("Availability") as HTMLSelectElement).value,
  ).toBe("inactive");
  expect(api).toHaveBeenCalledTimes(1);
});
it("does not expose availability editing for vehicles", () => {
  setup();
  expect(screen.queryByLabelText("Availability")).toBeNull();
});
