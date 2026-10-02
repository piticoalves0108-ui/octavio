"use client";

/**
 * Dialog no padrão shadcn/ui (Radix + Tailwind). Foco preso dentro, Esc fecha,
 * rolagem da página travada enquanto aberto.
 */
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { IconeFechar } from "./icones";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export function DialogContent({
  className,
  children,
  rotuloFechar = "Fechar",
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { rotuloFechar?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-grafite/70 backdrop-blur-sm data-[state=open]:animate-[aparece_0.3s_ease-out]" />
      <DialogPrimitive.Content
        data-lenis-prevent
        className={cn(
          "fixed z-[90] bg-gelo text-tinta shadow-2xl outline-none",
          "data-[state=open]:animate-[dialogo-entra_0.45s_var(--ease-saida)]",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute top-4 right-4 grid size-12 place-items-center rounded-full bg-gelo/90 text-grafite transition-colors hover:bg-areia"
          aria-label={rotuloFechar}
        >
          <IconeFechar className="size-5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
