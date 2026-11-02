import {it,expect,vi,afterEach} from 'vitest';
import {render,cleanup,act} from '@testing-library/react';
import {useVisibleSnapshot} from './useVisibleSnapshot';
import {useRead} from './useRead';
vi.mock('./useRead',()=>({useRead:vi.fn()}));
function Screen(){useVisibleSnapshot('/tracking',1000);return null;}
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers();});
it('waits for a settled read and pauses/resumes with tab visibility',()=>{
 vi.useFakeTimers();let hidden=false;vi.spyOn(document,'hidden','get').mockImplementation(()=>hidden);
 const ready={key:'ready',data:{}};vi.mocked(useRead).mockReturnValue(null);const view=render(<Screen/>);
 act(()=>vi.advanceTimersByTime(2000));expect(useRead).toHaveBeenLastCalledWith('/tracking',0,false);
 vi.mocked(useRead).mockReturnValue(ready);view.rerender(<Screen/>);act(()=>vi.advanceTimersByTime(1000));expect(useRead).toHaveBeenLastCalledWith('/tracking',1,false);
 act(()=>{hidden=true;document.dispatchEvent(new Event('visibilitychange'));});act(()=>vi.advanceTimersByTime(5000));expect(useRead).toHaveBeenLastCalledWith('/tracking',1,false);
 act(()=>{hidden=false;document.dispatchEvent(new Event('visibilitychange'));});expect(useRead).toHaveBeenLastCalledWith('/tracking',2,false);
 view.unmount();const calls=vi.mocked(useRead).mock.calls.length;act(()=>vi.advanceTimersByTime(5000));expect(vi.mocked(useRead).mock.calls).toHaveLength(calls);
});
