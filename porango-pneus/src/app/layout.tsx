import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Red_Hat_Text } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import { negocio } from "@/content/site";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { WhatsAppFlutuante } from "@/components/layout/WhatsAppFlutuante";
import { Preloader } from "@/components/motion/Preloader";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { TransicaoProvider } from "@/components/motion/Transicao";
import { jsonLdNegocio } from "@/lib/jsonld";
import { localTitulo } from "@/lib/contato";
import { MODO_PREVIA } from "@/lib/pendente";
import { SITE_URL } from "@/lib/site-url";

const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-chakra",
  display: "swap",
});

const redHat = Red_Hat_Text({
  subsets: ["latin"],
  variable: "--font-redhat",
  display: "swap",
});

const descricao =
  "Loja de pneus em Brasília - DF. Mande a medida do seu pneu pelo WhatsApp e receba a cotação. Pneu certo, preço justo.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${negocio.nome} | Pneus em ${localTitulo()} - ${negocio.uf}`,
    template: `%s | ${negocio.nome}`,
  },
  description: descricao,
  applicationName: negocio.nome,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: negocio.nome,
    url: "/",
    title: `${negocio.nome} | Pneus em ${localTitulo()} - ${negocio.uf}`,
    description: descricao,
  },
  twitter: { card: "summary_large_image" },
  // Prévia com informação a confirmar não deve ser indexada.
  robots: MODO_PREVIA ? { index: false, follow: false } : { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0f1012",
  colorScheme: "dark",
};

/**
 * Roda antes do primeiro paint: decide se o preloader aparece (primeira visita da
 * sessão e sem movimento reduzido) e marca que o JS está ativo.
 */
const scriptInicial = `(function(){try{var d=document.documentElement;d.classList.add('js');if(sessionStorage.getItem('porango-visto')||matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('sem-preloader')}}catch(e){}})();`;

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${chakra.variable} ${redHat.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptInicial }} />
        <noscript>
          <style>{`.preloader{display:none!important}`}</style>
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdNegocio()) }}
        />
      </head>
      <body>
        <a
          href="#conteudo"
          className="sr-only-focavel fixed top-3 left-3 z-[110] rounded bg-sinal px-4 py-2 font-display font-bold text-asfalto uppercase"
        >
          Pular para o conteúdo
        </a>
        <TransicaoProvider>
            <Preloader />
            <Header />
            <main id="conteudo" tabIndex={-1} className="outline-none">
              {children}
            </main>
            <Footer />
            <WhatsAppFlutuante />
        </TransicaoProvider>
        <SmoothScroll />
        {process.env.VERCEL && <Analytics />}
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="lazyOnload" />
            <Script id="ga4" strategy="lazyOnload">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
