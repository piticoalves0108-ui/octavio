import type { CSSProperties } from "react";

/**
 * Site de demonstração em miniatura (HTML de verdade, nítido em qualquer tela).
 * Escala junto com a moldura via container queries (unidades cqw).
 */

export type Theme = "bakery" | "barber" | "pizza" | "pet";

const THEMES: Record<
  Theme,
  {
    name: string;
    bg: string;
    ink: string;
    soft: string;
    accent: string;
    accentInk: string;
    headline: string;
    sub: string;
    links: string[];
    cards: { name: string; price?: string }[];
    hours: [string, string];
  }
> = {
  bakery: {
    name: "Padaria Bom Grão",
    bg: "#f6efe4",
    ink: "#35261b",
    soft: "#e9dcc8",
    accent: "#8f4815",
    accentInk: "#fff8ef",
    headline: "Pão quentinho toda manhã",
    sub: "Fornadas o dia todo, bolos caseiros e café passado na hora.",
    links: ["Início", "Cardápio", "Encomendas"],
    cards: [{ name: "Pão francês", price: "R$ 1,20" }, { name: "Bolo de cenoura" }, { name: "Pão de queijo", price: "R$ 4,50" }],
    hours: ["Seg a sex: 6h às 20h", "Sábado: 9h às 13h"],
  },
  barber: {
    name: "Barbearia Navalha",
    bg: "#121212",
    ink: "#efe7d6",
    soft: "#1f1d1a",
    accent: "#c9a15b",
    accentInk: "#121212",
    headline: "Corte e barba com hora marcada",
    sub: "Agende pelo WhatsApp e seja atendido na hora.",
    links: ["Serviços", "Equipe", "Agendar"],
    cards: [{ name: "Corte" }, { name: "Barba" }, { name: "Corte + barba" }],
    hours: ["Ter a sex: 9h às 20h", "Sábado: 8h às 18h"],
  },
  pizza: {
    name: "Forno a Lenha",
    bg: "#fff5ea",
    ink: "#2b1510",
    soft: "#f6e2cc",
    accent: "#bf2f20",
    accentInk: "#fff5ea",
    headline: "Pizza no forno a lenha",
    sub: "Massa de longa fermentação, entrega rápida na sua casa.",
    links: ["Cardápio", "Promoções", "Pedir"],
    cards: [{ name: "Margherita" }, { name: "Calabresa" }, { name: "Quatro queijos" }],
    hours: ["Ter a dom: 18h às 23h30", "Delivery e retirada"],
  },
  pet: {
    name: "Pet Feliz",
    bg: "#eef7f4",
    ink: "#12302b",
    soft: "#d9ede7",
    accent: "#f2b33d",
    accentInk: "#12302b",
    headline: "Banho e tosa com carinho",
    sub: "Seu pet cheiroso e feliz, com busca e entrega.",
    links: ["Serviços", "Loja", "Agendar"],
    cards: [{ name: "Banho" }, { name: "Tosa" }, { name: "Rações" }],
    hours: ["Seg a sáb: 8h às 19h", "Busca e entrega"],
  },
};

export type DemoState = {
  saturday?: string;
  cakePrice?: string;
  showcase?: "a" | "b";
  flash?: "hours" | "price" | "showcase" | null;
  /** Muda a cada atualização para reiniciar a animação de brilho. */
  flashKey?: number;
};

const cq = (n: number) => `${n}cqw`;

function Showcase({ theme, variant }: { theme: Theme; variant: "a" | "b" }) {
  const t = THEMES[theme];
  if (theme === "bakery") {
    const items =
      variant === "a"
        ? ["#c8742b", "#e3b26b", "#8a4b22", "#d99a4e", "#b5622a", "#efc98f"]
        : ["#e85d75", "#f6a5b3", "#7cc6a4", "#f2c14e", "#b07cc6", "#ff8f6b"];
    return (
      <svg viewBox="0 0 120 80" className="h-full w-full" aria-hidden="true">
        <rect width="120" height="80" rx="6" fill={variant === "a" ? "#3b2a1e" : "#2c1f33"} />
        <rect x="8" y="8" width="104" height="64" rx="3" fill={variant === "a" ? "#fdf3e3" : "#fff0f5"} opacity="0.14" />
        {[0, 1].map((row) => (
          <g key={row} transform={variant === "b" ? "translate(0 3)" : undefined}>
            <rect x="10" y={34 + row * 26} width="100" height="2.5" fill={t.soft} opacity="0.6" />
            {items.slice(row * 3, row * 3 + 3).map((c, i) => (
              <g key={i} transform={`translate(${22 + i * 34} ${row * 26})`}>
                {variant === "a" ? (
                  <ellipse cx="0" cy="27" rx="12" ry="7" fill={c} />
                ) : (
                  <>
                    <rect x="-11" y="16" width="22" height="18" rx="3" fill={c} />
                    <rect x="-11" y="16" width="22" height="5" rx="2" fill="#fff" opacity="0.7" />
                    <circle cx="0" cy="14" r="2.6" fill="#e8344e" />
                  </>
                )}
              </g>
            ))}
          </g>
        ))}
        <text x="60" y="13" textAnchor="middle" fontSize="5.5" fill="#fff" opacity="0.85" fontFamily="sans-serif">
          {variant === "a" ? "vitrine de pães" : "nova vitrine: doces de festa"}
        </text>
      </svg>
    );
  }
  if (theme === "barber") {
    return (
      <svg viewBox="0 0 120 80" className="h-full w-full" aria-hidden="true">
        <rect width="120" height="80" rx="6" fill="#1c1a17" />
        <rect x="52" y="10" width="16" height="60" rx="8" fill="#efe7d6" />
        <clipPath id="pole">
          <rect x="52" y="10" width="16" height="60" rx="8" />
        </clipPath>
        <g clipPath="url(#pole)">
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x="40" y={i * 10 - 6} width="40" height="4" fill={i % 2 ? "#c9a15b" : "#b33a2e"} transform="rotate(-25 60 40)" />
          ))}
        </g>
        <circle cx="60" cy="8" r="5" fill="#c9a15b" />
        <circle cx="60" cy="72" r="5" fill="#c9a15b" />
      </svg>
    );
  }
  if (theme === "pizza") {
    return (
      <svg viewBox="0 0 120 80" className="h-full w-full" aria-hidden="true">
        <rect width="120" height="80" rx="6" fill="#2b1510" />
        <circle cx="60" cy="40" r="30" fill="#e8b86a" />
        <circle cx="60" cy="40" r="25" fill="#d23a2a" />
        {[
          [50, 32],
          [68, 30],
          [62, 48],
          [46, 46],
          [74, 44],
        ].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="4.5" fill="#fff3d6" />
            <circle cx={x + 2} cy={y - 1} r="1.6" fill="#3f7d3a" />
          </g>
        ))}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 80" className="h-full w-full" aria-hidden="true">
      <rect width="120" height="80" rx="6" fill="#12302b" />
      <g fill="#f2b33d">
        <ellipse cx="60" cy="48" rx="13" ry="11" />
        <ellipse cx="44" cy="30" rx="5.5" ry="7" />
        <ellipse cx="55" cy="23" rx="5.5" ry="7" />
        <ellipse cx="66" cy="23" rx="5.5" ry="7" />
        <ellipse cx="77" cy="30" rx="5.5" ry="7" />
      </g>
    </svg>
  );
}

export function MiniSite({
  theme,
  state = {},
  assemble = false,
  className = "",
}: {
  theme: Theme;
  state?: DemoState;
  /** Monta o site em camadas (hero da página). */
  assemble?: boolean;
  className?: string;
}) {
  const t = THEMES[theme];
  const saturday = state.saturday ?? t.hours[1];
  const block = (i: number): CSSProperties | undefined =>
    assemble ? ({ ["--d" as string]: `${700 + i * 160}ms` } as CSSProperties) : undefined;
  const asm = assemble ? "fade-up" : "";
  const flash = (k: DemoState["flash"]) => (state.flash === k ? "updated-flash" : "");

  return (
    <div data-h="minisite" data-theme={theme} className={`@container h-full w-full ${className}`}>
      <div
        className="flex h-full w-full flex-col overflow-hidden text-left"
        style={{ background: t.bg, color: t.ink, fontFamily: "var(--font-sans)", fontSize: cq(1.7) }}
      >
        {/* Menu */}
        <div className={`flex items-center justify-between ${asm}`} style={{ padding: `${cq(2)} ${cq(3.2)}`, ...block(0) }}>
          <div className="flex items-center" style={{ gap: cq(1) }}>
            <span className="inline-block rounded-full" style={{ width: cq(2.6), height: cq(2.6), background: t.accent }} />
            <strong style={{ fontSize: cq(2), fontFamily: "var(--font-display)" }}>{t.name}</strong>
          </div>
          <div className="flex items-center" style={{ gap: cq(2.4) }}>
            {t.links.map((l) => (
              <span key={l} className="hidden @[260px]:inline" style={{ opacity: 0.75 }}>
                {l}
              </span>
            ))}
            <span className="rounded-full font-semibold" style={{ background: t.accent, color: t.accentInk, padding: `${cq(0.6)} ${cq(1.6)}` }}>
              WhatsApp
            </span>
          </div>
        </div>

        {/* Banner */}
        <div className={`grid flex-none grid-cols-[1.05fr_1fr] items-center ${asm}`} style={{ gap: cq(3), padding: `${cq(2)} ${cq(3.2)}`, ...block(1) }}>
          <div>
            <div style={{ fontSize: cq(4.3), lineHeight: 1.02, fontWeight: 700, fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>{t.headline}</div>
            <p style={{ marginTop: cq(1.4), opacity: 0.72, lineHeight: 1.35 }}>{t.sub}</p>
            <span className="mt-[2cqw] inline-block rounded-full font-semibold" style={{ background: t.ink, color: t.bg, padding: `${cq(0.9)} ${cq(2)}` }}>
              Pedir pelo WhatsApp
            </span>
          </div>
          <div key={`s${state.flashKey ?? 0}`} data-h="ms-showcase" className={`overflow-hidden ${flash("showcase")}`} style={{ aspectRatio: "3 / 2", borderRadius: cq(1.2) }}>
            <Showcase theme={theme} variant={state.showcase ?? "a"} />
          </div>
        </div>

        {/* Cards */}
        <div className={`grid grid-cols-3 ${asm}`} style={{ gap: cq(1.6), padding: `${cq(1)} ${cq(3.2)}`, ...block(2) }}>
          {t.cards.map((c, i) => {
            const isCake = theme === "bakery" && i === 1;
            const price = isCake ? state.cakePrice ?? "R$ 32" : c.price;
            return (
              <div
                key={c.name}
                className="flex items-center justify-between"
                style={{ background: t.soft, borderRadius: cq(1), padding: `${cq(1.4)} ${cq(1.6)}` }}
              >
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                {price && (
                  <span
                    key={isCake ? `p${state.flashKey ?? 0}` : undefined}
                    data-h={isCake ? "ms-price" : undefined}
                    className={isCake ? flash("price") : ""}
                    style={{ fontWeight: 700, color: t.accent, borderRadius: cq(0.6), padding: `0 ${cq(0.5)}` }}
                  >
                    {price}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Horário e endereço */}
        <div className={`mt-auto flex items-center justify-between ${asm}`} style={{ padding: `${cq(2)} ${cq(3.2)}`, ...block(3) }}>
          <div className="flex flex-wrap items-center" style={{ gap: cq(1.6) }}>
            <span style={{ opacity: 0.7 }}>{t.hours[0]}</span>
            <span
              key={`h${state.flashKey ?? 0}`}
              data-h="ms-saturday"
              className={flash("hours")}
              style={{ fontWeight: 700, borderRadius: cq(0.6), padding: `${cq(0.2)} ${cq(0.6)}` }}
            >
              {saturday}
            </span>
          </div>
          <span style={{ opacity: 0.7 }}>Como chegar →</span>
        </div>
        <div className={asm} style={{ height: cq(1.2), background: t.accent, ...block(4) }} />
      </div>
    </div>
  );
}
