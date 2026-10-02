import type { Metadata, Viewport } from "next";
import { Barlow, Big_Shoulders } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { WhatsAppFlutuante } from "@/components/conversao/WhatsAppFlutuante";
import { Header } from "@/components/layout/Header";
import { Rodape } from "@/components/layout/Rodape";
import { MotorDeMovimento } from "@/components/motion/MotorDeMovimento";
import { Preloader } from "@/components/motion/Preloader";
import { TransicaoProvider } from "@/components/motion/Transicao";
import { negocio } from "@/content/negocio";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// "Big Shoulders Display" hoje é o corte de tamanho óptico (opsz 72) da família
// variável "Big Shoulders" no Google Fonts. Com o eixo opsz, títulos grandes
// usam o desenho Display automaticamente (font-optical-sizing: auto).
const bigShoulders = Big_Shoulders({
  subsets: ["latin"],
  axes: ["opsz"],
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "Impact", "sans-serif"],
  variable: "--font-big-shoulders",
  display: "swap",
});

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

const TITULO = `${negocio.nome} | Churrasquinho, hambúrguer e almoço em Taguatinga Norte - DF`;
const DESCRICAO = `${negocio.ramo} na QI 23, Setor Industrial, em frente ao Top Life Miami Beach. ${negocio.horario.resumo}. Peça pelo WhatsApp ou pelo iFood.`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITULO, template: `%s | ${negocio.nome}` },
  description: DESCRICAO,
  applicationName: negocio.nome,
  keywords: ["churrasquinho", "espetinho", "hambúrguer", "almoço", "Taguatinga Norte", "Setor Industrial", "QI 23", "Top Life Miami Beach", "delivery", "Brasília"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: negocio.nome,
    title: TITULO,
    description: DESCRICAO,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRICAO },
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#121212",
  colorScheme: "dark",
};

/** Roda antes do primeiro paint: pula o preloader em visitas repetidas e com movimento reduzido. */
const SCRIPT_PRELOADER = `try{var d=document.documentElement;if(sessionStorage.getItem('brasa-acesa')||matchMedia('(prefers-reduced-motion: reduce)').matches){d.dataset.preloader='off'}}catch(e){document.documentElement.dataset.preloader='off'}`;

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${bigShoulders.variable} ${barlow.variable}`} data-palco="poster" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_PRELOADER }} />
        <noscript>
          <style>{"#preloader{display:none!important}"}</style>
        </noscript>
      </head>
      <body>
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-ambar focus:px-5 focus:py-3 focus:font-semibold focus:text-carvao">
          Pular para o conteúdo
        </a>
        <MotorDeMovimento>
          <TransicaoProvider>
            <Preloader />
            <Header />
            <main id="conteudo">{children}</main>
            <Rodape />
            <WhatsAppFlutuante />
          </TransicaoProvider>
        </MotorDeMovimento>
        <Analytics />
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="lazyOnload" />
            <Script id="ga4" strategy="lazyOnload">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
