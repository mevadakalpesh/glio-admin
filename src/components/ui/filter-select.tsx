import { useState } from "react";
import { Check, PlusCircle, Search } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Badge } from "./badge";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type Option = { value: string; label: string };
/** Single-value server filter. Hidden input preserves the surrounding form contract. */
export function FilterSelect({
  name,
  label,
  defaultValue = "",
  options,
  disabled = false,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  options: Option[];
  disabled?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const visible = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  function choose(next: string) {
    setValue(next);
    setSearch("");
    setOpen(false);
  }
  return (
    <>
      <input type="hidden" name={name} value={value} disabled={disabled} />
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch("");
        }}
      >
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="h-9 border-dashed"
              aria-label={`Filter ${label}`}
            />
          }
        >
          <PlusCircle size={15} />
          {label}
          {value && (
            <Badge variant="secondary" className="ml-1 max-w-40 truncate">
              {selected?.label || value}
            </Badge>
          )}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-1">
          <div className="relative border-b p-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-3.5 text-muted-foreground"
            />
            <Input
              aria-label={`Search ${label} options`}
              placeholder={`Search ${label.toLowerCase()}…`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="border-0 pl-8 shadow-none"
            />
          </div>
          <div
            className="max-h-64 overflow-y-auto"
            role="group"
            aria-label={`${label} options`}
          >
            {visible.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant="ghost"
                aria-pressed={value === option.value}
                onClick={() =>
                  choose(value === option.value ? "" : option.value)
                }
                className="h-auto min-h-9 w-full justify-start whitespace-normal text-left"
              >
                <span
                  className={`flex size-4 shrink-0 items-center justify-center rounded border ${value === option.value ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}
                >
                  {value === option.value && <Check size={12} />}
                </span>
                {option.label}
              </Button>
            ))}
            {!visible.length && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                No options found.
              </p>
            )}
          </div>
          {value && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => choose("")}
              className="w-full border-t"
            >
              Clear {label.toLowerCase()}
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </>
  );
}
