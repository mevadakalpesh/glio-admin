import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { addFilter } from "./filterTestHelpers";
import { Access } from "./Access";
import { api } from "./api";
vi.mock("./api", () => ({ api: vi.fn() }));
vi.mock("./useAuth", () => ({useAuth: () => ({session: {staff: {permissions: ["audit.read", "audit.export"]}}})}));
afterEach(() => {cleanup();vi.resetAllMocks();});
it("loads URL audit filters, applies combined exact filters and clears them", async () => {
 vi.mocked(api).mockResolvedValue({items: [],total: 0,page: 1});
 render(<MemoryRouter initialEntries={["/?action=auth.password_verified"]}><Access audit /></MemoryRouter>);
 await waitFor(()=>expect(api).toHaveBeenLastCalledWith("/audit?page=1&action=auth.password_verified",expect.anything()));
 await addFilter("Staff actor ID");
 await userEvent.type(screen.getByLabelText("Staff actor ID"),"11111111-1111-4111-8111-111111111111");
 await waitFor(()=>expect(api).toHaveBeenLastCalledWith("/audit?page=1&action=auth.password_verified&actor=11111111-1111-4111-8111-111111111111",expect.anything()));
 await userEvent.click(screen.getByRole("button",{name:"Clear all filters"}));
 await waitFor(()=>expect(api).toHaveBeenLastCalledWith("/audit?page=1",expect.anything()));
});
it("combines record and IST date filters, preserves them while paging, and clears them", async () => {
 vi.mocked(api).mockResolvedValue({items:[],total:30,page:1});
 const id="11111111-1111-4111-8111-111111111111";
 render(<MemoryRouter initialEntries={[`/?reference=${id}&from=2026-10-20&to=2026-10-20`]}><Access audit /></MemoryRouter>);
 await waitFor(()=>expect(api).toHaveBeenLastCalledWith(`/audit?page=1&reference=${id}&from=2026-10-20&to=2026-10-20`,expect.anything()));
 await userEvent.click(screen.getByRole("button",{name:"Next"}));
 await waitFor(()=>expect(api).toHaveBeenLastCalledWith(`/audit?page=2&reference=${id}&from=2026-10-20&to=2026-10-20`,expect.anything()));
 await addFilter("Event ID");
 await userEvent.type(screen.getByLabelText("Event ID"),id);
 await waitFor(()=>expect(api).toHaveBeenLastCalledWith(`/audit?page=1&reference=${id}&event=${id}&from=2026-10-20&to=2026-10-20`,expect.anything()));
 await userEvent.click(screen.getByRole("button",{name:"Clear all filters"}));
 await waitFor(()=>expect(api).toHaveBeenLastCalledWith("/audit?page=1",expect.anything()));
});
it("shows event identity and recorded metadata without crashing on an unavailable time", async()=>{
 vi.mocked(api).mockResolvedValue({items:[{id:"event-reference",action:"staff.updated",actor_id:null,subject_id:null,created_at:"bad",metadata:{reason:"Access reviewed",password_hash:"[Redacted]"}}],total:1,page:1});
 render(<MemoryRouter><Access audit /></MemoryRouter>);
 expect(await screen.findByText("Event: event-reference")).toBeTruthy();
 expect(screen.getByText("staff.updated")).toBeTruthy();
 expect(screen.getByText("Time unavailable")).toBeTruthy();
 expect(screen.getByText("System")).toBeTruthy();
 await userEvent.click(screen.getByRole("button",{name:"Actions for event event-reference"}));
 await userEvent.click(await screen.findByRole("menuitem",{name:"View event"}));
 expect(screen.getByText(/Access reviewed/)).toBeTruthy();
});
it("shows search failures and does not present an empty result as success",async()=>{
 vi.mocked(api).mockRejectedValue(new Error("Use valid dates"));
 render(<MemoryRouter><Access audit /></MemoryRouter>);
 expect(await screen.findByRole("alert")).toHaveProperty("textContent","Use valid dates");
 expect(screen.queryByText("No records found.")).toBeNull();
 expect(screen.getByRole("button",{name:"Next"}).hasAttribute("disabled")).toBe(true);
});

it("hides reset without filters and does not submit incomplete UUIDs", async()=>{
 vi.mocked(api).mockResolvedValue({items:[],total:0,page:1});
 render(<MemoryRouter><Access audit /></MemoryRouter>);
 await waitFor(()=>expect(api).toHaveBeenCalledTimes(1));
 expect(screen.queryByRole('button',{name:'Clear all filters'})).toBeNull();
 expect(screen.queryByText('Filter audit history')).toBeNull();
 await addFilter('Event ID');
 await userEvent.type(screen.getByLabelText('Event ID'),'1111');
 await new Promise(resolve=>setTimeout(resolve,500));
 expect(api).toHaveBeenCalledTimes(1);
 await userEvent.click(screen.getByRole('button',{name:'Clear all filters'}));
 expect(screen.queryByLabelText('Event ID')).toBeNull();
});
it("applies date presets immediately with the existing action filter",async()=>{
 vi.mocked(api).mockResolvedValue({items:[],total:0,page:1});
 render(<MemoryRouter initialEntries={['/?action=staff.updated']}><Access audit /></MemoryRouter>);
 await userEvent.click(screen.getByRole('button',{name:'Audit date range (IST)'}));
 await userEvent.click(screen.getByRole('button',{name:'Today'}));
 await waitFor(()=>expect(api).toHaveBeenLastCalledWith(expect.stringMatching(/audit\?page=1&action=staff.updated&from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/),expect.anything()));
});

it("opens export from the header and discards its draft when closed",async()=>{
 vi.mocked(api).mockResolvedValue({items:[],total:0,page:1});
 render(<MemoryRouter><Access audit /></MemoryRouter>);
 expect(screen.queryByLabelText('Audit export reason')).toBeNull();
 await userEvent.click(screen.getByRole('button',{name:'Export audit summary'}));
 expect(await screen.findByRole('dialog')).toBeTruthy();
 await userEvent.type(screen.getByLabelText('Audit export reason'),'Review audit history');
 expect(screen.getByRole('button',{name:'Download audit CSV'})).toHaveProperty('disabled',true);
 await userEvent.click(screen.getByRole('button',{name:'Close dialog'}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
 await userEvent.click(screen.getByRole('button',{name:'Export audit summary'}));
 expect(await screen.findByLabelText('Audit export reason')).toHaveProperty('value','');
});
