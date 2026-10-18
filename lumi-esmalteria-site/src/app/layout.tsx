import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import { brand, fullAddress, isLiveSite } from "@/data/brand";
import { Providers } from "@/components/Providers";
import { Loader } from "@/components/motion/Loader";
import { Cursor } from "@/components/motion/Cursor";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";
import { instagramUrl } from "@/lib/whatsapp";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

const title = `${brand.name} · Nail design, spa dos pés e esmaltação em gel em Brasília`;

export const metadata: Metadata = {
  metadataBase: new URL(brand.siteUrl),
  title: { default: title, template: `%s · ${brand.name}` },
  description: brand.description,
  applicationName: brand.name,
  keywords: ["esmalteria Brasília", "manicure Brasília", "nail design", "esmaltação em gel", "alongamento de unhas", "spa dos pés", "nail art", "unhas"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "pt_BR", siteName: brand.name, title, description: brand.description, url: "/" },
  twitter: { card: "summary_large_image", title, description: brand.description },
  // Prévia (sem domínio configurado) não é indexada
  robots: isLiveSite ? { index: true, follow: true } : { index: false, follow: false },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#FAF7F2", colorScheme: "light", width: "device-width", initialScale: 1 };

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "NailSalon",
  name: brand.name,
  description: brand.description,
  url: brand.siteUrl,
  telephone: `+${brand.contact.whatsapp}`,
  address: { "@type": "PostalAddress", addressLocality: brand.location.city, addressRegion: brand.location.state, addressCountry: "BR", ...(brand.location.address ? { streetAddress: brand.location.address } : {}) },
  areaServed: fullAddress,
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
