import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import { brand, isLiveSite } from "@/data/brand";
import { Providers } from "@/components/Providers";
import { Loader } from "@/components/motion/Loader";
import { Cursor } from "@/components/motion/Cursor";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";
import { instagramUrl } from "@/lib/whatsapp";
import { hasPublicUrl, siteTitle } from "@/lib/seo";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(brand.siteUrl),
  title: { default: siteTitle, template: `%s · ${brand.name}` },
  description: brand.description,
  applicationName: brand.name,
  keywords: ["esmalteria Brasília", "manicure Brasília", "nail design", "esmaltação em gel", "alongamento de unhas", "spa dos pés", "nail art", "unhas"],
  // Sem canonical/og:url aqui: cada página declara o seu (via pageMetadata), e a 404 não aponta para a home
  openGraph: { type: "website", locale: "pt_BR", siteName: brand.name, title: siteTitle, description: brand.description },
  twitter: { card: "summary_large_image", title: siteTitle, description: brand.description },
  // Prévia (sem domínio configurado) não é indexada
  robots: isLiveSite ? { index: true, follow: true } : { index: false, follow: false },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#FAF7F2", colorScheme: "light", width: "device-width", initialScale: 1 };

// Só dados confirmados: endereço entra quando for preenchido em brand.ts, e a url só com domínio público
const { address, city, state } = brand.location;
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "NailSalon",
  name: brand.name,
  description: brand.description,
  ...(hasPublicUrl ? { url: brand.siteUrl } : {}),
  telephone: `+${brand.contact.whatsapp}`,
  ...(address ? { address: { "@type": "PostalAddress", streetAddress: address, addressLocality: city, addressRegion: state, addressCountry: "BR" } } : {}),
  areaServed: `${city} - ${state}`,
  sameAs: [instagramUrl],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{if(sessionStorage.getItem('lumi-loaded'))document.documentElement.classList.add('is-loaded')}catch(e){}` }} />
        <noscript>
          <style>{`.site-loader{display:none!important}`}</style>
        </noscript>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      </head>
      <body className="grain">
        <Providers>
          <Loader />
          <Header />
          <main id="conteudo">{children}</main>
          <Footer />
          <WhatsAppFloat />
          <Cursor />
        </Providers>
      </body>
    </html>
  );
}
