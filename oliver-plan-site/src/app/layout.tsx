import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import { brand, fullAddress } from "@/data/brand";
import { Providers } from "@/components/Providers";
import { Loader } from "@/components/motion/Loader";
import { Cursor } from "@/components/motion/Cursor";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { instagramUrl } from "@/lib/whatsapp";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
  variable: "--font-fraunces",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const title = `${brand.name} · Móveis planejados de alto padrão`;

export const metadata: Metadata = {
  metadataBase: new URL(brand.siteUrl),
  title: { default: title, template: `%s · ${brand.name}` },
  description: brand.description,
  applicationName: brand.name,
  keywords: [
    "móveis planejados",
    "móveis sob medida",
    "marcenaria de alto padrão",
    "cozinha planejada",
    "closet planejado",
    "home office planejado",
    "painel ripado",
    "projeto 3D de interiores",
    brand.showroom.city,
  ],
  authors: [{ name: brand.name }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: brand.name,
    title,
    description: brand.description,
    url: "/",
  },
  twitter: { card: "summary_large_image", title, description: brand.description },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#F4EFE9",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FurnitureStore",
  name: brand.name,
  description: brand.description,
  url: brand.siteUrl,
  email: brand.contact.email,
  telephone: `+${brand.contact.whatsapp}`,
  foundingDate: String(brand.founded),
  address: {
    "@type": "PostalAddress",
    streetAddress: brand.showroom.street,
    addressLocality: brand.showroom.city,
    addressRegion: brand.showroom.state,
    postalCode: brand.showroom.zip,
    addressCountry: "BR",
  },
  sameAs: [instagramUrl],
  openingHours: ["Mo-Fr 09:00-18:00", "Sa 09:00-13:00"],
  areaServed: fullAddress,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        {/* Visitante que já viu a abertura nesta sessão não vê o loader de novo */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(sessionStorage.getItem('op-loaded'))document.documentElement.classList.add('is-loaded')}catch(e){}`,
          }}
        />
        <noscript>
          <style>{`.site-loader{display:none!important}`}</style>
        </noscript>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className="grain">
        <Providers>
          <Loader />
          <Header />
          <main id="conteudo">{children}</main>
          <Footer />
          <Cursor />
        </Providers>
      </body>
    </html>
  );
}
