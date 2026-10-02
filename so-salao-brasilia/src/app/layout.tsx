import type { Metadata, Viewport } from "next";
import "./globals.css";
import { dmSerif, outfit } from "@/lib/fontes";
import { siteUrl } from "@/lib/site";
import { negocio } from "@/content/negocio";
import { scriptClasseIntro } from "@/components/layout/Intro";

const tituloPadrao = `${negocio.nome} | Fábrica de móveis para salão de beleza e esmalteria em Taguatinga Norte - DF`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: tituloPadrao, template: `%s | ${negocio.nome}` },
  description: negocio.descricaoCurta,
  applicationName: negocio.nome,
  keywords: [
    "móveis para salão de beleza",
    "cadeira de cabeleireiro",
    "lavatório para salão",
    "bancada de manicure",
    "móveis para esmalteria",
    "fábrica de móveis Taguatinga",
    "móveis para salão Brasília",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: negocio.nome,
    title: tituloPadrao,
    description: negocio.descricaoCurta,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: tituloPadrao, description: negocio.descricaoCurta },
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f7f5f3",
  colorScheme: "light",
};

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${dmSerif.variable} ${outfit.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptClasseIntro }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
