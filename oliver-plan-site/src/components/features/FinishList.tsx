"use client";

import { getFinish } from "@/data/finishes";
import { FinishSwatch } from "@/components/ui/FinishSwatch";

/** Lista de acabamentos do projeto, com amostra procedural de cada material. */
export function FinishList({ items }: { items: { id: string; application: string }[] }) {
  return (
    <ul className="divide-y divide-graphite/10 border-y border-graphite/10">
      {items.map((it) => {
        const f = getFinish(it.id);
        return (
          <li key={it.id} className="flex items-center gap-5 py-5">
            <FinishSwatch finish={f} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl">{f.name}</p>
              <p className="text-sm text-stone">{it.application}</p>
            </div>
            <span className="eyebrow hidden text-[0.6rem] text-stone sm:block">{f.collection}</span>
          </li>
        );
      })}
    </ul>
  );
}
