import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateRangeFilter } from "./date-range-filter";
import { ColumnPicker } from "./column-picker";
import { useState } from "react";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("uses inclusive IST presets and submits date-only values", async () => {
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-28T20:00:00Z"));
  const user = userEvent.setup();
  render(
    <form aria-label="Filters">
      <DateRangeFilter />
    </form>,
  );
  await user.click(screen.getByRole("button", { name: "Scheduled dates" }));
  await user.click(screen.getByRole("button", { name: "Last 7 days" }));
  const data = new FormData(screen.getByRole("form") as HTMLFormElement);
  expect(data.get("from")).toBe("2026-10-23");
  expect(data.get("to")).toBe("2026-10-29");
  await user.click(screen.getByRole("button", { name: "Clear dates" }));
  expect(
    new FormData(screen.getByRole("form") as HTMLFormElement).get("from"),
  ).toBe("");
});
it("shows calendar-only selection and preserves initial dates", async () => {
 render(<form aria-label="Filters"><DateRangeFilter from="2026-10-01" to="2026-10-28" /></form>);
 await userEvent.click(screen.getByRole("button",{name:"Scheduled dates"}));
 expect(document.querySelector('input[type="date"]')).toBeNull();
 expect(screen.queryByRole('textbox')).toBeNull();
 const data=new FormData(screen.getByRole('form') as HTMLFormElement);
 expect(data.get('from')).toBe('2026-10-01');expect(data.get('to')).toBe('2026-10-28');
});
it("blocks required report submission without a complete range",()=>{
 const submit=vi.fn();render(<form aria-label="Filters" onSubmit={submit}><DateRangeFilter required/></form>);
 fireEvent.submit(screen.getByRole('form'));expect(submit).not.toHaveBeenCalled();expect(screen.getByRole('alert').textContent).toContain('Choose a start and end date');
});
it("toggles and resets optional columns", async () => {
  function Example() {
    const [hidden, setHidden] = useState<string[]>([]);
    return (
      <>
        <ColumnPicker
          columns={[{ key: "status", label: "Status" }]}
          hidden={hidden}
          onChange={setHidden}
        />
        <output>{hidden.join(",") || "All visible"}</output>
      </>
    );
  }
  render(<Example />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Columns" }));
  await user.click(screen.getByRole("checkbox", { name: "Status" }));
  expect(screen.getByText("status")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Reset columns" }));
  expect(screen.getByText("All visible")).toBeTruthy();
});

it('auto-applies only after both calendar endpoints are chosen',async()=>{
 const onChange=vi.fn();vi.spyOn(Date,'now').mockReturnValue(Date.parse('2026-10-18T06:00:00Z'));
 render(<DateRangeFilter onChange={onChange}/>);await userEvent.click(screen.getByRole('button',{name:'Scheduled dates'}));
 const buttons=()=>Array.from(document.querySelectorAll<HTMLButtonElement>('button[data-day]'));
 const pick=(day:string)=>fireEvent.click(buttons().find(button=>button.dataset.day===new Date(day+'T12:00:00').toLocaleDateString())!);
 pick('2026-10-05');expect(onChange).not.toHaveBeenCalled();pick('2026-10-15');expect(onChange).toHaveBeenLastCalledWith({from:'2026-10-05',to:'2026-10-15'});
});
