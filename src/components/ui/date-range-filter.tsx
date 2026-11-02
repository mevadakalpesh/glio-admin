import { useEffect, useRef, useState } from "react";
import {
  format,
  parseISO,
  addDays,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  subMonths,
} from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarDays } from "lucide-react";
import { Calendar } from "./calendar";
import { Button } from "./button";
import { Popover, PopoverTrigger, PopoverContent } from "./popover";

export function DateRangeFilter({
  from = "",
  to = "",
  label = "Scheduled dates",
  fromName = "from", toName = "to", required = false, min, max, onChange,
}: {
  onChange?: (range: {from:string;to:string})=>void;
  from?: string;
  to?: string;
  label?: string;
  fromName?: string; toName?: string; required?: boolean; min?: string; max?: string;
}) {
  const rangeStart = useRef<Date | null>(null);
  const root = useRef<HTMLSpanElement>(null);
  const [error,setError]=useState(false);
  const [range, setRange] = useState<DateRange | undefined>(() =>
    from || to
      ? {
          from: from ? parseISO(from) : undefined,
          to: to ? parseISO(to) : undefined,
        }
      : undefined,
  );
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [month, setMonth] = useState<Date | undefined>(() =>
    from ? parseISO(from) : undefined,
  );
  const [today, setToday] = useState(() => parseISO(new Date(Date.now() + 19800000).toISOString().slice(0, 10)));
  const date = (d?: Date) => (d ? format(d, "yyyy-MM-dd") : "");
  useEffect(()=>{
    const form=root.current?.closest('form');
    const validate=(event:Event)=>{if(required&&(!range?.from||!range?.to)){event.preventDefault();event.stopPropagation();setError(true);setOpen(true);}};
    form?.addEventListener('submit',validate,true);
    return ()=>form?.removeEventListener('submit',validate,true);
  },[required,range]);
  const presets: [string, Date, Date][] = [
    ["Today", today, today],
    ["Yesterday", addDays(today, -1), addDays(today, -1)],
    ["This week", startOfWeek(today, { weekStartsOn: 1 }), today],
    ["Last 7 days", addDays(today, -6), today],
    ["Last 28 days", addDays(today, -27), today],
    ["This month", startOfMonth(today), today],
    [
      "Last month",
      startOfMonth(subMonths(today, 1)),
      endOfMonth(subMonths(today, 1)),
    ],
    ["This year", startOfYear(today), today],
  ];
  return (
    <span ref={root} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name={fromName} value={date(range?.from)} />
      <input type="hidden" name={toName} value={date(range?.to)} />
      <Popover open={open} onOpenChange={next => {setOpen(next); if(next) setToday(parseISO(new Date(Date.now()+19800000).toISOString().slice(0,10)));}}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              aria-label={label}
              className="h-9 max-w-full font-normal"
            />
          }
        >
          <CalendarDays size={16} />
          {range?.from
            ? `${format(range.from, "dd MMM yyyy")}${range.to ? " – " + format(range.to, "dd MMM yyyy") : " – …"}`
            : range?.to ? `Until ${format(range.to,"dd MMM yyyy")}` : label}
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto max-w-[calc(100vw-2rem)] p-0"
        >
          <div className="flex flex-col sm:flex-row">
            <div className="grid grid-cols-2 gap-1 border-b p-3 sm:flex sm:min-w-36 sm:flex-col sm:border-r sm:border-b-0">
              {presets.map(([name, start, end]) => (
                <Button
                  key={name}
                  type="button"
                  variant="ghost"
                  className="justify-start font-normal aria-pressed:bg-muted"
                  aria-pressed={activePreset===name}
                  disabled={Boolean((min&&date(start)<min)||(max&&date(end)>max))}
                  onClick={() => {
                    setError(false);
                    setActivePreset(name);
                    setRange({ from: start, to: end });
                    setMonth(start);
                    rangeStart.current=null;
                    onChange?.({from:date(start),to:date(end)});
                  }}
                >
                  {name}
                </Button>
              ))}
            </div>
            <div className="p-2">
              <Calendar
                mode="range"
                selected={range}
                onSelect={onChange?undefined:value=>{setActivePreset(null);setRange(value);setError(false);}}
                onDayClick={onChange?(day,modifiers)=>{
                  if(modifiers.disabled)return;
                  setActivePreset(null);setError(false);
                  if(!rangeStart.current){rangeStart.current=day;setRange({from:day,to:undefined});return;}
                  const start=rangeStart.current;rangeStart.current=null;
                  const next=day<start?{from:day,to:start}:{from:start,to:day};
                  setRange(next);onChange({from:date(next.from),to:date(next.to)});
                }:undefined}
                disabled={[...(min?[{before:parseISO(min)}]:[]),...(max?[{after:parseISO(max)}]:[])]}
                month={month || today}
                onMonthChange={setMonth}
              />

            </div>
          </div>
          <div className="flex justify-between border-t p-3">
            {Boolean(range?.from||range?.to)&&<Button
              type="button"
              variant="ghost"
              onClick={() => {setActivePreset(null);setRange(undefined);rangeStart.current=null;onChange?.({from:"",to:""});}}
            >
              Clear dates
            </Button>}
            <Button
              type="button"
              disabled={Boolean(
                range?.from && range.to && range.to < range.from,
              )}
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {error&&<span role="alert" className="text-xs text-destructive">Choose a start and end date.</span>}
    </span>
  );
}
