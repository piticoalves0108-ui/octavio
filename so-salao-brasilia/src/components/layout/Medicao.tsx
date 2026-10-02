import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";

/**
 * Medição de cliques:
 * - Vercel Analytics: liga sozinho quando o site roda na Vercel.
 * - GA4 (opcional): defina NEXT_PUBLIC_GA_ID. Carrega depois que a página fica ociosa.
 */
export function Medicao() {
  const ga = process.env.NEXT_PUBLIC_GA_ID;
  const naVercel = !!process.env.VERCEL;
  return (
    <>
      {naVercel && <Analytics />}
      {ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="lazyOnload" />
          <Script id="ga4" strategy="lazyOnload">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga}',{anonymize_ip:true});`}
          </Script>
        </>
      )}
    </>
  );
}
