import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterSelect } from "./filter-select";
afterEach(cleanup);
it("searches options, submits the server value, and clears the filter", async () => {
  const user = userEvent.setup();
  render(
    <form aria-label="Filters">
      <FilterSelect
        name="status"
        label="Status"
        options={[
          { value: "1", label: "Searching" },
          { value: "8", label: "Completed" },
        ]}
      />
    </form>,
  );
  await user.click(screen.getByRole("button", { name: "Filter Status" }));
  await user.type(
    screen.getByRole("textbox", { name: "Search Status options" }),
    "complete",
  );
  expect(
    screen.queryByRole("button", { name: /^Searching$/ }),
  ).toBeNull();
  await user.click(
    screen.getByRole("button", { name: /^Completed$/ }),
  );
  const form = screen.getByRole("form") as HTMLFormElement;
  expect(new FormData(form).get("status")).toBe("8");
  await user.click(screen.getByRole("button", { name: "Filter Status" }));
  await user.click(screen.getByRole("button", { name: "Clear status" }));
  expect(new FormData(form).get("status")).toBe("");
});
it("preserves an existing selection before options arrive and supports no-results", async () => {
  const user = userEvent.setup();
  render(
    <form aria-label="Filters">
      <FilterSelect
        name="status"
        label="Status"
        defaultValue="8"
        options={[]}
      />
    </form>,
  );
  expect(
    new FormData(screen.getByRole("form") as HTMLFormElement).get("status"),
  ).toBe("8");
  await user.click(screen.getByRole("button", { name: "Filter Status" }));
  expect(screen.getByText("No options found.")).toBeTruthy();
});
