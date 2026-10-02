"use client";

/**
 * Accordion no padrão shadcn/ui (Radix + Tailwind), com a tipografia da marca.
 */
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { IconeMais } from "./icones";

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({ className, ...props }: ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn("border-b border-grafite/15", className)} {...props} />;
}

export function AccordionTrigger({ className, children, ...props }: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "group/gatilho flex min-h-12 flex-1 items-center justify-between gap-6 py-6 text-left",
          "font-serif text-[1.45rem] leading-tight md:text-[1.75rem]",
          "transition-colors hover:text-champanhe-texto",
          className,
        )}
        {...props}
      >
        {children}
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-grafite/20 transition-transform duration-500 ease-[var(--ease-saida)] group-data-[state=open]/gatilho:rotate-45 group-data-[state=open]/gatilho:bg-grafite group-data-[state=open]/gatilho:text-gelo">
          <IconeMais className="size-4" />
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({ className, children, ...props }: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="overflow-hidden data-[state=closed]:animate-[acordeao-fecha_0.35s_var(--ease-saida)] data-[state=open]:animate-[acordeao-abre_0.45s_var(--ease-saida)]"
      {...props}
    >
      <div className={cn("max-w-3xl pb-7 text-tinta-suave texto-grande", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
