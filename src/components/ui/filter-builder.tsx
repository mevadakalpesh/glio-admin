import {useEffect, useRef, useState, type ReactNode} from 'react';
import {Filter, Search, SlidersHorizontal, X} from 'lucide-react';
import {Button} from './button';
import {Input} from './input';
import {NativeSelect} from './native-select';
import {Popover, PopoverContent, PopoverTrigger} from './popover';
export type FilterField = {key:string;label:string;value:string;operator?:string;options?:{value:string;label:string}[];maxLength?:number;normalize?:(value:string)=>string;valid?:(value:string)=>boolean};
/** Server-backed attributes only: operators describe the endpoint's actual search semantics. */
export function FilterBuilder({fields,onChange,children,onClear,hasExtraFilters=false}:{fields:FilterField[];onChange:(values:Record<string,string>)=>void;children?:ReactNode;onClear?:()=>void;hasExtraFilters?:boolean}) {
 const [added,setAdded]=useState<string[]>([]),[open,setOpen]=useState(false),[search,setSearch]=useState('');
 const visible=fields.filter(field=>field.value||added.includes(field.key));
 const available=fields.filter(field=>!visible.includes(field)&&field.label.toLowerCase().includes(search.toLowerCase()));
 return <div className="flex flex-wrap items-center gap-2">
  {visible.map(field=><div key={field.key} className="inline-flex max-w-full items-center rounded-lg border bg-background text-sm">
   <span className="flex shrink-0 items-center gap-2 px-3 py-2 font-medium">{field.options?<SlidersHorizontal size={14}/>:<Search size={14}/>} {field.label}</span>
   <span className="border-x px-2 py-2 text-muted-foreground">{field.operator||'is'}</span>
   {field.options?<NativeSelect aria-label={field.label} className="h-9 min-w-32 rounded-none border-0 shadow-none" value={field.value} onChange={e=>onChange({[field.key]:e.target.value})}><option value="">Select…</option>{field.options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect>:<FilterText field={field} onChange={value=>onChange({[field.key]:value})}/>}
   <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Remove ${field.label} filter`} title={`Remove ${field.label} filter`} onClick={()=>{setAdded(previous=>previous.filter(key=>key!==field.key));onChange({[field.key]:''});}}><X size={14}/></Button>
  </div>)}
  <Popover open={open} onOpenChange={value=>{setOpen(value);setSearch('');}}>
   <PopoverTrigger render={<Button variant="outline" type="button" className="h-9"/>}><Filter size={15}/>Filters</PopoverTrigger>
   <PopoverContent align="start" className="w-64 gap-1 p-1">
    <Input aria-label="Search filter attributes" placeholder="Search attributes…" value={search} onChange={e=>setSearch(e.target.value)} className="border-0 border-b rounded-none shadow-none"/>
    {available.map(field=><Button key={field.key} variant="ghost" className="w-full justify-start" onClick={()=>{setAdded(previous=>[...previous,field.key]);setOpen(false);}}>{field.options?<SlidersHorizontal size={16}/>:<Search size={16}/>} {field.label}</Button>)}
    {!available.length&&<p className="p-3 text-sm text-muted-foreground">No more matching filters.</p>}
   </PopoverContent>
  </Popover>
  {children}
  {(!!visible.length||hasExtraFilters)&&<Button variant="ghost" size="icon" aria-label="Clear all filters" title="Clear all filters" onClick={()=>{setAdded([]);if(onClear)onClear();else onChange(Object.fromEntries(fields.map(field=>[field.key,''])));}}><X size={16}/></Button>}
 </div>;
}
function FilterText({field,onChange}:{field:FilterField;onChange:(value:string)=>void}){
 const [draft,setDraft]=useState({applied:field.value,text:field.value});
 const value=draft.applied===field.value?draft.text:field.value;
 const latest=useRef({field,onChange});
 useEffect(()=>{latest.current={field,onChange};},[field,onChange]);
 useEffect(()=>{const timer=setTimeout(()=>{const {field,onChange}=latest.current;const next=field.normalize?field.normalize(value):value.trim();if(next!==field.value&&(!next||!field.valid||field.valid(next)))onChange(next);},400);return()=>clearTimeout(timer);},[value]);
 return <Input aria-label={field.label} autoFocus={!field.value} value={value} onChange={e=>setDraft({applied:field.value,text:e.target.value})} maxLength={field.maxLength||100} placeholder="Enter value…" className="h-9 w-44 min-w-20 rounded-none border-0 shadow-none"/>;
}
