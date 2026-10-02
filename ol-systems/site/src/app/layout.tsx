import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { Analytics } from "@/components/Analytics";
import { MotionProvider } from "@/components/MotionProvider";
import { SmoothScroll } from "@/components/SmoothScroll";
import { site } from "@/config/site";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const title = `Sites profissionais por R$ ${site.price}/mês com atualizações | ${site.name}`;
const description =
  "A OL Systems cria, publica e cuida do site da sua empresa ou perfil do Instagram por R$ 250/mês. Mudou preço, horário ou foto? Manda no WhatsApp que a gente atualiza.";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: site.name,
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#050506",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body>
        <div className="dot-grid" aria-hidden="true" />
        <SmoothScroll />
        <MotionProvider>{children}</MotionProvider>
        <Analytics />
        {/* O script do Vercel Analytics só existe quando o site roda na Vercel. */}
        {process.env.VERCEL && <VercelAnalytics />}
      </body>
    </html>
  );
}
