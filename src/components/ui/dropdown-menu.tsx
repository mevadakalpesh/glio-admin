import * as React from "react";
import { Menu } from "@base-ui/react/menu";
import { cn } from "cn";
export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
export function DropdownMenuContent({className, ...props}: React.ComponentProps<typeof Menu.Popup>) {
  return <Menu.Portal><Menu.Positioner align="end" sideOffset={8} className="z-50"><Menu.Popup data-slot="dropdown-menu-content" className={cn("min-w-56 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg outline-none",className)} {...props}/></Menu.Positioner></Menu.Portal>;
}
export function DropdownMenuItem({className, ...props}: React.ComponentProps<typeof Menu.Item>) {
  return <Menu.Item data-slot="dropdown-menu-item" className={cn("flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-highlighted:bg-muted data-disabled:opacity-50",className)} {...props}/>;
}
