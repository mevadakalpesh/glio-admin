import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {SupportAttachments} from './SupportAttachments';
const mock=vi.hoisted(()=>({api:vi.fn()}));vi.mock('./api',()=>({api:mock.api}));vi.mock('./useAuth',()=>({useAuth:()=>({session:{csrf_token:'csrf'}})}));
const list={items:[{id:'photo',created_at:'2026-10-24T00:00:00Z',byte_size:500}]};
afterEach(()=>{cleanup();mock.api.mockReset();});
it('loads on demand, carries reason and CSRF for each image, hides private bytes',async()=>{
 mock.api.mockResolvedValueOnce(list).mockResolvedValueOnce({mime:'image/webp',image_base64:'YWJj'});
 render(<SupportAttachments id="ticket" reason="Review submitted evidence"/>);expect(mock.api).not.toHaveBeenCalled();fireEvent.click(screen.getByText('Load support photos'));fireEvent.click(await screen.findByText('View support photo 1'));
 await screen.findByAltText('Customer support evidence');expect(mock.api).toHaveBeenLastCalledWith('/support-tickets/ticket/attachments/photo',expect.objectContaining({method:'POST',csrf:'csrf',body:{reason:'Review submitted evidence'}}));
 fireEvent.click(screen.getByText('Hide support photos'));expect(screen.queryByAltText('Customer support evidence')).toBeNull();
});
it('failed refresh removes old evidence and supports a fresh retry',async()=>{
 mock.api.mockResolvedValueOnce(list).mockResolvedValueOnce({mime:'image/webp',image_base64:'YWJj'}).mockRejectedValueOnce(Error('Storage unavailable'));
 render(<SupportAttachments id="ticket" reason="Review submitted evidence"/>);fireEvent.click(screen.getByText('Load support photos'));fireEvent.click(await screen.findByText('View support photo 1'));await screen.findByAltText('Customer support evidence');
 fireEvent.click(screen.getByText('Load support photos'));await screen.findByRole('alert');expect(screen.queryByAltText('Customer support evidence')).toBeNull();expect(screen.queryByText('View support photo 1')).toBeNull();
});
it('aborts hidden or unmounted reads and rejects malformed image data',async()=>{
 let resolve:(v:unknown)=>void=()=>{};mock.api.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 const view=render(<SupportAttachments id="ticket" reason="Review submitted evidence"/>);fireEvent.click(screen.getByText('Load support photos'));const signal=mock.api.mock.calls[0][1].signal;fireEvent.click(screen.getByText('Hide support photos'));expect(signal.aborted).toBe(true);resolve(list);await waitFor(()=>expect(screen.queryByText('View support photo 1')).toBeNull());
 mock.api.mockResolvedValueOnce(list).mockResolvedValueOnce({mime:'text/html',image_base64:'bad'});fireEvent.click(screen.getByText('Load support photos'));fireEvent.click(await screen.findByText('View support photo 1'));await screen.findByRole('alert');expect(screen.queryByAltText('Customer support evidence')).toBeNull();view.unmount();
});
