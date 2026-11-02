import {useEffect,useState} from 'react';
import {useRead} from './useRead';
// Poll only after the previous read settles; resume immediately on tab visibility.
export function useVisibleSnapshot<T>(path:string,intervalMs=30000,retainDuringRefresh=false){
 const [version,setVersion]=useState(0);
 const result=useRead<T>(path,version,retainDuringRefresh);
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  if(result&&!document.hidden)timer=setTimeout(()=>setVersion(v=>v+1),intervalMs);
  const resume=()=>{clearTimeout(timer);if(!document.hidden)setVersion(v=>v+1);};
  document.addEventListener('visibilitychange',resume);
  return ()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',resume);};
 },[result,intervalMs]);
 return {result,refresh:()=>setVersion(v=>v+1)};
}
