import {afterEach, expect, it, vi} from 'vitest';
import {act, cleanup, render, screen, waitFor} from '@testing-library/react';
import {useEffect} from 'react';
import {AuthProvider} from './auth';
import {useAuth} from './useAuth';
import type {Session} from './authTypes';
let auth: ReturnType<typeof useAuth>;
function Harness(){const value=useAuth();useEffect(()=>{auth=value;},[value]);return <div>{value.loading?'loading':value.session?.staff.name||'signed out'}<span>{value.unavailable}</span><span>{value.recovery.join(',')}</span></div>}
const session=(name:string)=>({staff:{id:name,name,email:'test@example.invalid',active:true,mfa_enabled:true,role:'owner',permissions:[]},csrf_token:'test-csrf'}) as Session;
const response=(value:unknown,status=200)=>new Response(JSON.stringify(status===200?{success:true,data:value}:{success:false,message:value}),{status});
function deferred(){let resolve!:(value:Response)=>void;const promise=new Promise<Response>(r=>{resolve=r});return {promise,resolve};}
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('expired session cannot be restored by an earlier successful check',async()=>{
 const check=deferred();vi.stubGlobal('fetch',vi.fn().mockReturnValue(check.promise));render(<AuthProvider><Harness/></AuthProvider>);
 await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1));
 act(()=>window.dispatchEvent(new Event('gilo-session-expired')));
 await act(async()=>check.resolve(response(session('Old owner'))));
 expect(screen.getByText('signed out')).toBeTruthy();expect(screen.queryByText('Old owner')).toBeNull();
});
it('new sign-in supersedes a delayed failed session check and preserves new recovery codes',async()=>{
 const check=deferred();vi.stubGlobal('fetch',vi.fn().mockReturnValue(check.promise));render(<AuthProvider><Harness/></AuthProvider>);
 await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1));
 act(()=>auth.accept({...session('New owner'),recovery_codes:['new-code']}));
 await act(async()=>check.resolve(response('Old outage',503)));
 expect(screen.getByText('New owner')).toBeTruthy();expect(screen.getByText('new-code')).toBeTruthy();expect(screen.queryByText('Old outage')).toBeNull();
});
it('logout supersedes an outstanding session reload',async()=>{
 const check=deferred();vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(response(session('Owner'))).mockReturnValueOnce(check.promise).mockResolvedValueOnce(response({})));
 render(<AuthProvider><Harness/></AuthProvider>);await screen.findByText('Owner');
 let pending!:Promise<void>;act(()=>{pending=auth.reload();});await act(()=>auth.logout());
 await act(async()=>{check.resolve(response(session('Owner')));await pending;});
 expect(screen.getByText('signed out')).toBeTruthy();
});
it('failed logout preserves the current session and reports failure to the caller',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(response(session('Owner'))).mockResolvedValueOnce(response('Connection unavailable',503)));
 render(<AuthProvider><Harness/></AuthProvider>);await screen.findByText('Owner');
 await act(async()=>{await expect(auth.logout()).rejects.toThrow('Connection unavailable');});
 expect(screen.getByText('Owner')).toBeTruthy();
});
it('an older logout response cannot erase a newer sign-in',async()=>{
 const logout=deferred();vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(response(session('Old owner'))).mockReturnValueOnce(logout.promise));
 render(<AuthProvider><Harness/></AuthProvider>);await screen.findByText('Old owner');
 let pending!:Promise<void>;act(()=>{pending=auth.logout();auth.accept(session('New owner'));});
 await act(async()=>{logout.resolve(response({}));await pending;});
 expect(screen.getByText('New owner')).toBeTruthy();
});
