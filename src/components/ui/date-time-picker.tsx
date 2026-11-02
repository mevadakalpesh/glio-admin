import {useId,useState} from 'react';
import {CalendarIcon} from 'lucide-react';
import {Button} from './button';
import {Calendar} from './calendar';
import {NativeSelect} from './native-select';
import {Popover,PopoverContent,PopoverTrigger} from './popover';

// Keep the local wall-clock value intact. The policy API converts IST to UTC.
export function DateTimePicker({label,value,onChange,disabled=false,dateLabel='Activation date'}:{dateLabel?:string;label:string;value:string;onChange:(value:string)=>void;disabled?:boolean}){
 const id=useId(),[open,setOpen]=useState(false);
 const [date='',time='09:00']=value.split('T');
 const [hour='09',minute='00']=time.split(':');
 const selected=date?new Date(`${date}T12:00:00`):undefined;
 const [year]=useState(()=>new Date().getFullYear());
 const pad=(n:number)=>String(n).padStart(2,'0');
 return <fieldset className="space-y-2" disabled={disabled}><legend className="text-sm font-medium">{label}</legend><div className="flex flex-wrap items-end gap-3">
 <div><label htmlFor={`${id}-date`} className="mb-1 block text-sm text-muted-foreground">{dateLabel}</label><Popover open={open} onOpenChange={setOpen}><PopoverTrigger render={<Button id={`${id}-date`} type="button" variant="outline" disabled={disabled} className="min-w-48 justify-start"/>}><CalendarIcon size={16}/>{selected?selected.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'Choose date'}</PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" captionLayout="dropdown" startMonth={new Date(year-1,0)} endMonth={new Date(year+10,11)} selected={selected} defaultMonth={selected} disabled={disabled} onSelect={day=>{if(!day)return;onChange(`${day.getFullYear()}-${pad(day.getMonth()+1)}-${pad(day.getDate())}T${hour}:${minute}`);setOpen(false);}}/></PopoverContent></Popover></div>
 <div className="w-24"><label htmlFor={`${id}-hour`} className="mb-1 block text-sm text-muted-foreground">Hour</label><NativeSelect id={`${id}-hour`} value={hour} disabled={disabled} onChange={e=>onChange(`${date}T${e.target.value}:${minute}`)}>{Array.from({length:24},(_,n)=><option key={n} value={pad(n)}>{pad(n)}</option>)}</NativeSelect></div>
 <div className="w-24"><label htmlFor={`${id}-minute`} className="mb-1 block text-sm text-muted-foreground">Minute</label><NativeSelect id={`${id}-minute`} value={minute} disabled={disabled} onChange={e=>onChange(`${date}T${hour}:${e.target.value}`)}>{Array.from({length:60},(_,n)=><option key={n} value={pad(n)}>{pad(n)}</option>)}</NativeSelect></div>
 <span className="pb-2 text-sm text-muted-foreground">IST · 24-hour time</span></div></fieldset>;
}
