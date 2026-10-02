import type { ReactNode } from "react";
import { SvgGlobe } from "./SvgGlobe";

/** Moldura de notebook (tela + base), toda em CSS. */
export function Laptop({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="rounded-[14px] border border-white/15 bg-[#0b0c0f] p-[1.6%] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.08)]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[6px] bg-white">{children}</div>
      </div>
      <div className="relative mx-[-6%] h-[10px] rounded-b-[14px] rounded-t-[3px] bg-gradient-to-b from-[#2a2c31] to-[#121316]">
        <div className="absolute left-1/2 top-0 h-[4px] w-[16%] -translate-x-1/2 rounded-b-md bg-black/50" />
      </div>
    </div>
  );
}

/** Moldura de navegador (portfólio). */
export function BrowserFrame({ children, url, className = "" }: { children: ReactNode; url: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-white/12 bg-[#0f1013] shadow-2xl ${className}`}>
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="ml-2 truncate rounded-md bg-white/6 px-2 py-0.5 text-[11px] text-muted">{url}</span>
      </div>
      <div className="aspect-[16/10]">{children}</div>
    </div>
  );
}

/** Moldura de celular. */
export function Phone({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-[2.2rem] border border-white/15 bg-[#0b0c0f] p-[7px] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.95),inset_0_1px_0_rgb(255_255_255/0.08)] ${className}`}
    >
      <div className="relative h-full overflow-hidden rounded-[1.75rem] bg-[#0b141a] [container-type:inline-size]">
        <div className="absolute left-1/2 top-[3%] z-10 h-[3.2%] w-[34%] -translate-x-1/2 rounded-full bg-black" />
        {children}
      </div>
    </div>
  );
}

export type ChatMsg = { id: string; from: "client" | "us"; text: string; attachment?: boolean; typing?: boolean };

/** Conversa no estilo do WhatsApp entre o cliente e a OL Systems. */
export function Chat({
  messages,
  compact = false,
  notch = true,
}: {
  messages: ChatMsg[];
  compact?: boolean;
  /** Dentro da moldura do celular o topo precisa de folga para o notch. */
  notch?: boolean;
}) {
  return (
    <div
      className="flex h-full flex-col"
      style={{ fontSize: compact ? "clamp(6px, 5.6cqw, 12px)" : "clamp(12px, 4.6cqw, 14px)" }}
    >
      <div className={`flex items-center gap-[0.7em] bg-[#1f2c34] px-[1em] pb-[0.7em] ${notch ? "pt-[2.8em]" : "pt-[0.7em]"}`}>
        <span className="grid h-[2.4em] w-[2.4em] place-items-center rounded-full bg-black text-white">
          <SvgGlobe className="h-[1.8em] w-[1.8em]" strokeWidth={0.9} />
        </span>
        <div className="leading-tight">
          <div className="font-semibold text-white">OL Systems</div>
          <div className="text-[0.8em] text-white/55">online</div>
        </div>
      </div>
      <div
        className="flex flex-1 flex-col justify-end gap-[0.6em] overflow-hidden px-[0.85em] py-[0.9em]"
        style={{
          backgroundColor: "#0b141a",
          backgroundImage: "radial-gradient(rgb(255 255 255 / 0.035) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
        aria-live="polite"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`fade-up max-w-[86%] rounded-[0.9em] px-[0.8em] py-[0.55em] leading-snug text-white shadow ${
              m.from === "client" ? "self-end rounded-tr-sm bg-[#005c4b]" : "self-start rounded-tl-sm bg-[#202c33]"
            }`}
          >
            {m.typing ? (
              <span className="flex gap-[0.3em] py-[0.3em]">
                <span className="sr-only">digitando</span>
                <span aria-hidden="true" className="typing-dot h-[0.45em] w-[0.45em] rounded-full bg-white/80" />
                <span aria-hidden="true" className="typing-dot h-[0.45em] w-[0.45em] rounded-full bg-white/80" />
                <span aria-hidden="true" className="typing-dot h-[0.45em] w-[0.45em] rounded-full bg-white/80" />
              </span>
            ) : (
              <>
                {m.attachment && (
                  <span className="mb-[0.4em] block overflow-hidden rounded-[0.6em]">
                    <svg viewBox="0 0 120 60" className="block w-full" aria-label="foto da nova vitrine">
                      <rect width="120" height="60" fill="#2c1f33" />
                      {["#e85d75", "#7cc6a4", "#f2c14e", "#b07cc6"].map((c, i) => (
                        <rect key={c} x={12 + i * 26} y="26" width="18" height="16" rx="3" fill={c} />
                      ))}
                      <rect x="8" y="44" width="104" height="2" fill="#fff" opacity="0.4" />
                    </svg>
                  </span>
                )}
                {m.text}
                <span className="ml-2 inline-block translate-y-0.5 text-[0.75em] text-white/50">
                  {m.from === "client" ? "✓✓" : ""}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
