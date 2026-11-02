import {it,expect,vi,afterEach} from 'vitest';
import {api} from './api';
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
it('invalidates support alerts only after a confirmed successful support mutation',async()=>{
 const dispatch=vi.spyOn(window,'dispatchEvent');vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({success:true,data:{}})}));
 for(const path of ['/support-tickets/id/response','/support-tickets/id/assignment','/support-tickets/id/follow-up','/support-tickets/id/acknowledge','/support-tickets/id/priority','/support-response-policy','/support-escalation-policy']){
  await api(path,{method:'POST',body:{},csrf:'csrf'});
 }
 expect(dispatch.mock.calls.filter(([event])=>event.type==='gilo-support-alerts-changed')).toHaveLength(7);
 dispatch.mockClear();await api('/support-tickets/alerts');await api('/support-tickets/id/inspection',{method:'POST'});await api('/support-tickets/id/attachments',{method:'POST'});expect(dispatch).not.toHaveBeenCalled();
});
it('failed or unconfirmed mutations do not invalidate counts as a success',async()=>{
 const dispatch=vi.spyOn(window,'dispatchEvent');vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:409,json:async()=>({success:false,message:'Ticket changed'})}));
 await expect(api('/support-tickets/id/response',{method:'POST'})).rejects.toThrow('Ticket changed');expect(dispatch).not.toHaveBeenCalled();
});
