import type { Servico } from "@/content/site";

type P = { className?: string };

/** Pneu visto de lado: banda com ressaltos, roda de 5 raios. */
export function IconePneu({ className }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" fill="none">
      <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="3" />
      {/* 24 ressaltos da banda num só traço */}
      <circle cx="24" cy="24" r="22.6" stroke="currentColor" strokeWidth="3.2" strokeDasharray="2.2 3.72" />
      <circle cx="24" cy="24" r="12.5" stroke="currentColor" strokeWidth="2" />
      {[0, 72, 144, 216, 288].map((a) => (
        <path key={a} d="M24 13.5 L24 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" transform={`rotate(${a} 24 24)`} />
      ))}
      <circle cx="24" cy="24" r="3.2" fill="currentColor" />
    </svg>
  );
}

export function IconeServico({ tipo, className }: { tipo: Servico["icone"]; className?: string }) {
  if (tipo === "alinhamento") {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="6" y="14" width="8" height="20" rx="2" />
        <rect x="34" y="14" width="8" height="20" rx="2" />
        <path d="M14 24h20" />
        <path d="M10 10V4M38 10V4" strokeDasharray="2 3" />
      </svg>
    );
  }
  if (tipo === "balanceamento") {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="24" cy="24" r="19" />
        <circle cx="24" cy="24" r="10" />
        <rect x="21" y="3.5" width="6" height="5" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (tipo === "freio") {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="24" cy="24" r="17" />
        <circle cx="24" cy="24" r="5" />
        <path d="M8 14a20 20 0 0 1 10-8" strokeWidth="6" strokeLinecap="round" />
      </svg>
    );
  }
  if (tipo === "suspensao") {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M24 4v6M24 38v6" />
        <path d="M16 10h16l-16 5h16l-16 5h16l-16 5h16l-16 5h16l-16 5h16" strokeLinejoin="round" />
      </svg>
    );
  }
  if (tipo === "roda") {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="24" cy="24" r="19" />
        {[0, 72, 144, 216, 288].map((a) => (
          <path key={a} d="M24 9 L24 19" transform={`rotate(${a} 24 24)`} strokeLinecap="round" />
        ))}
        <circle cx="24" cy="24" r="4" />
      </svg>
    );
  }
  if (tipo === "montagem") {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="24" cy="24" r="19" />
        <circle cx="24" cy="24" r="11" />
        <path d="M30 6l6 10M36 16l-8 2" strokeLinecap="round" />
      </svg>
    );
  }
  return <IconePneu className={className} />;
}

export function IconeWhatsApp({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm0 18.15a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 1 1 6.98 3.86Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.13-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29Z" />
    </svg>
  );
}

export function IconeInstagram({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconeSeta({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="square" />
    </svg>
  );
}

export function IconeTelefone({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconePino({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
