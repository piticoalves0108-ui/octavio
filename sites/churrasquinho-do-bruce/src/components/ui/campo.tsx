import * as React from "react";
import { cn } from "@/lib/utils";

/** Input e Label no padrão shadcn/ui, na paleta do site. */
export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-12 w-full rounded-xl border border-carvao-3 bg-carvao px-4 text-base text-osso placeholder:text-fumaca transition-colors focus-visible:border-ambar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ambar/40",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label data-slot="label" className={cn("text-sm font-semibold text-osso/90", className)} {...props} />;
}
