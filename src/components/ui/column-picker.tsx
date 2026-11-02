import { Columns3 } from "lucide-react";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
export function ColumnPicker({
  columns,
  hidden,
  onChange,
}: {
  columns: { key: string; label: string }[];
  hidden: string[];
  onChange: (hidden: string[]) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" className="ml-auto h-9" />
        }
      >
        <Columns3 size={15} />
        Columns
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52">
        <p className="px-2 text-xs text-muted-foreground">Display columns</p>
        {columns.map((c) => (
          <label
            key={c.key}
            className="flex cursor-pointer items-center justify-between gap-4 rounded-md p-2 hover:bg-muted"
          >
            {c.label}
            <Checkbox
              checked={!hidden.includes(c.key)}
              onCheckedChange={(checked) =>
                onChange(
                  checked
                    ? hidden.filter((key) => key !== c.key)
                    : [...hidden, c.key],
                )
              }
            />
          </label>
        ))}
        {hidden.length>0&&<Button type="button" variant="ghost" onClick={() => onChange([])}>
          Reset columns
        </Button>}
      </PopoverContent>
    </Popover>
  );
}
