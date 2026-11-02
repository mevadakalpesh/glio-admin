import {createContext,useContext,useEffect} from 'react';
export const CatalogBusyContext=createContext<(busy:boolean)=>void>(()=>{});
export function useCatalogBusy(busy:boolean){const report=useContext(CatalogBusyContext);useEffect(()=>{report(busy);return ()=>report(false);},[busy,report]);}
