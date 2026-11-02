import {Dialog as Primitive} from '@base-ui/react/dialog';
import {X} from 'lucide-react';
import {cn} from 'cn';
export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogTitle = Primitive.Title;
export const DialogDescription = Primitive.Description;
export function DialogContent({children,className,...props}:Primitive.Popup.Props){
 return <Primitive.Portal><Primitive.Backdrop className="fixed inset-0 z-50 bg-black/40"/><Primitive.Popup {...props} className={cn('fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-background p-6 shadow-xl outline-none',className)}>{children}<Primitive.Close aria-label="Close dialog" className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted focus-visible:ring-2"><X size={18}/></Primitive.Close></Primitive.Popup></Primitive.Portal>;
}
