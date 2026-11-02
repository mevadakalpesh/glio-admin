import {Tooltip as TooltipPrimitive} from '@base-ui/react/tooltip';
import {cn} from 'cn';
export function TooltipProvider(props:TooltipPrimitive.Provider.Props){return <TooltipPrimitive.Provider delay={300} {...props}/>;}
export function Tooltip(props:TooltipPrimitive.Root.Props){return <TooltipPrimitive.Root {...props}/>;}
export function TooltipTrigger(props:TooltipPrimitive.Trigger.Props){return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props}/>;}
export function TooltipContent({className,side='top',sideOffset=6,...props}:TooltipPrimitive.Popup.Props & Pick<TooltipPrimitive.Positioner.Props,'side'|'sideOffset'>){return <TooltipPrimitive.Portal><TooltipPrimitive.Positioner side={side} sideOffset={sideOffset} className="z-50"><TooltipPrimitive.Popup data-slot="tooltip-content" className={cn('max-w-64 rounded-md bg-foreground px-3 py-2 text-xs text-background shadow-md',className)} {...props}/></TooltipPrimitive.Positioner></TooltipPrimitive.Portal>;}
