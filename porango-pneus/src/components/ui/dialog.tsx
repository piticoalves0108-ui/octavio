"use client";

/**
 * Dialog (shadcn/ui sobre Radix). Usado no lightbox da galeria.
 * Foco preso dentro, Esc fecha, volta o foco para quem abriu.
 */
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[95] bg-asfalto/90 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-[96] w-[min(92vw,960px)] -translate-x-1/2 -translate-y-1/2 outline-none",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute -top-14 right-0 flex h-11 w-11 items-center justify-center rounded-full border border-faixa/30 bg-asfalto text-faixa hover:border-sinal hover:text-sinal">
          <span className="sr-only">Fechar</span>
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" />
          </svg>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
