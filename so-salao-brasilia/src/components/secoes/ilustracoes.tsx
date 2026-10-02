/** Ilustrações de traço das etapas do processo (decorativas). */
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
  viewBox: "0 0 120 120",
};

export function IlustracaoEscolha({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <rect x="18" y="30" width="44" height="60" rx="6" />
      <rect x="40" y="22" width="44" height="60" rx="6" />
      <rect x="62" y="14" width="44" height="60" rx="6" />
      <circle cx="84" cy="36" r="9" />
      <path d="M70 60h28M70 66h18" />
    </svg>
  );
}

export function IlustracaoProducao({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M14 98V54l22 12V54l22 12V54l22 12V30h22v68z" />
      <path d="M86 30V18h10v12" />
      <path d="M26 82h12M50 82h12M74 82h12" />
      <path d="M8 98h104" />
    </svg>
  );
}

export function IlustracaoEntrega({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M10 34h62v46H10zM72 50h22l14 16v14H72z" />
      <circle cx="30" cy="84" r="9" />
      <circle cx="88" cy="84" r="9" />
      <path d="M80 56h12l7 8H80z" />
    </svg>
  );
}

export function IlustracaoMontagem({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M40 30h40a8 8 0 0 1 8 8v26H32V38a8 8 0 0 1 8-8z" />
      <path d="M26 64h68v10H26z" />
      <path d="M60 74v18M44 100h32M60 92v8" />
      <path d="M24 64V50M96 64V50" />
    </svg>
  );
}
