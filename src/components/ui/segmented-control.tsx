import type { ComponentProps } from "react";
import { cn } from "cn";
import { Button } from "./button";

export function SegmentedControl({className, ...props}: ComponentProps<"div">) {
  return <div role="group" className={cn("inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl bg-muted p-1", className)} {...props} />;
}

export function SegmentedItem({className, ...props}: ComponentProps<typeof Button>) {
  return <Button {...props} variant="ghost" className={cn("h-8 rounded-lg border border-transparent px-3 text-sm font-medium text-muted-foreground shadow-none hover:bg-background/50 hover:text-foreground aria-pressed:border-border/40 aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm", className)} />;
}
