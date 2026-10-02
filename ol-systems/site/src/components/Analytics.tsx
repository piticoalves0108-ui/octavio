"use client";

import Script from "next/script";
import { useEffect } from "react";
import { track } from "@vercel/analytics";
import { contactChannel, site } from "@/config/site";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

/** Guarda as UTMs da primeira visita para saber se veio da bio ou do anúncio. */
function readUtms(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const params = new URLSearchParams(window.location.search);
    const saved = JSON.parse(sessionStorage.getItem("ol_utm") ?? "{}") as Record<string, string>;
    for (const k of UTM_KEYS) {
      const v = params.get(k) ?? saved[k];
      if (v) out[k] = v;
    }
    sessionStorage.setItem("ol_utm", JSON.stringify(out));
  } catch {
    // Navegação privada pode bloquear o sessionStorage: segue sem salvar.
  }
  return out;
}

/**
 * GA4 + Meta Pixel (só carregam se os IDs estiverem configurados) e o
 * evento de clique em qualquer botão de contato ([data-cta]).
 */
export function Analytics() {
  const { ga4Id, metaPixelId } = site.analytics;

  useEffect(() => {
    const utms = readUtms();
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-cta]");
      if (!el) return;
      const params = { cta: el.dataset.cta ?? "", channel: contactChannel, ...utms };
      window.gtag?.("event", "whatsapp_click", params);
      window.fbq?.("track", "Contact", params);
      track("whatsapp_click", params);
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return (
    <>
      {ga4Id && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}');`}
          </Script>
        </>
      )}
      {metaPixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
