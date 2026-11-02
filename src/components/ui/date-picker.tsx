import * as React from 'react';
import {CalendarIcon} from 'lucide-react';
import {Calendar} from './calendar';
import {Popover, PopoverContent, PopoverTrigger} from './popover';
import {Input} from './input';
import {Button} from './button';

// Calendar dates stay YYYY-MM-DD; never round-trip through UTC timestamps.
function parseDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}
export function DatePicker({className, ...props}: React.ComponentProps<'input'>) {
  const input = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [calendarValue, setCalendarValue] = React.useState('');
  const selected = parseDate(calendarValue);
  const min = parseDate(props.min), max = parseDate(props.max);
  function select(date: Date | undefined) {
    if (!date || !input.current) return;
    const value = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    // Dispatch through the real field so controlled handlers and FormData agree.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set?.call(input.current,value);
    input.current.dispatchEvent(new Event('input',{bubbles:true}));
    input.current.dispatchEvent(new Event('change',{bubbles:true}));
    setOpen(false);
  }
  return <span className="relative block min-w-40">
    <Input {...props} type="date" ref={input} className={`${className ?? ''} pr-10 [&::-webkit-calendar-picker-indicator]:hidden`} />
    <Popover open={open} onOpenChange={next=>{if(next)setCalendarValue(input.current?.value??'');setOpen(next);}}>
      <PopoverTrigger render={<Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1" aria-label="Open calendar" disabled={props.disabled||props.readOnly}/>}><CalendarIcon aria-hidden="true" /></PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" aria-label="Choose date">
        <Calendar mode="single" selected={selected} defaultMonth={selected} onSelect={select} disabled={[...(min?[{before:min}]:[]),...(max?[{after:max}]:[])]}/>
      </PopoverContent>
    </Popover>
  </span>;
}
