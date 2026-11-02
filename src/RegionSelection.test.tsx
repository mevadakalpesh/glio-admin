import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegionSelection } from "./RegionSelection";
import { api } from "./api";
vi.mock("./api", () => ({ api: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it("submits existing and edited state assignments", async () => {
  vi.mocked(api).mockResolvedValue([{ code: "GJ", name: "Gujarat" }, { code: "RJ", name: "Rajasthan" }]);
  const { container } = render(<form><RegionSelection selected={["GJ"]} disabled={false} /></form>);
  const gujarat = await screen.findByRole("checkbox", { name: "Gujarat" });
  expect((gujarat as HTMLInputElement).checked).toBe(true);
  await userEvent.click(screen.getByRole("checkbox", { name: "Rajasthan" }));
  expect(new FormData(container.querySelector("form")!).getAll("assigned_states")).toEqual(["GJ", "RJ"]);
});
it("failed option loading preserves existing assignments", async () => {
  vi.mocked(api).mockRejectedValue(Error("offline"));
  const { container } = render(<form><RegionSelection selected={["GJ"]} disabled={false} /></form>);
  await screen.findByRole("alert");
  expect(new FormData(container.querySelector("form")!).getAll("assigned_states")).toEqual(["GJ"]);
});
