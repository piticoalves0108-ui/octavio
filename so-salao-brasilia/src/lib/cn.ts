/** Junta classes condicionais (equivalente enxuto do `cn` do shadcn/ui). */
export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
