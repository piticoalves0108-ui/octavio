"use client";

/**
 * Dialog do shadcn/ui (new-york), adaptado à paleta. Usado no "Pedir agora"
 * e no menu mobile: foco preso, Esc fecha, foco volta ao botão de origem.
 */
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { IconeFechar } from "@/components/Icones";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-[80] bg-carvao/80 backdrop-blur-sm transition-opacity duration-300 data-[state=closed]:opacity-0 data-[state=open]:opacity-100 starting:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  rotuloFechar = "Fechar",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { rotuloFechar?: string }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-lenis-prevent
        className={cn(
          "fixed left-1/2 top-1/2 z-[81] w-[min(calc(100vw-2rem),34rem)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-carvao-3 bg-carvao-2 p-6 shadow-[0_40px_120px_-20px_rgba(255,90,31,0.35)] outline-none transition duration-300 ease-[var(--ease-brasa)] sm:p-8",
          "data-[state=closed]:opacity-0 data-[state=closed]:scale-95 starting:opacity-0 starting:scale-95",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 grid size-11 place-items-center rounded-full text-fumaca transition-colors hover:bg-carvao-3 hover:text-osso">
          <IconeFechar className="size-5" />
          <span className="sr-only">{rotuloFechar}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-2 pr-10", className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("titulo titulo-sm text-osso", className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn("text-fumaca", className)} {...props} />;
}

export { Dialog, DialogTrigger, DialogPortal, DialogClose, DialogOverlay, DialogContent, DialogHeader, DialogTitle, DialogDescription };
