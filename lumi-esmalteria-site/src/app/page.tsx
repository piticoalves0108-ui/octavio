import type { ResolvingMetadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Hero } from "@/sections/home/Hero";
import { BookingCTA, FeaturedServices, GalleryTeaser, MarqueeBand, Testimonials, TryOnSection, WhyLumi } from "@/sections/home/HomeSections";

// Título e descrição padrão do layout; canonical e og:url da home ficam aqui, não no layout
export function generateMetadata(_: unknown, parent: ResolvingMetadata) {
  return pageMetadata(parent, { path: "/" });
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <MarqueeBand />
      <FeaturedServices />
      <WhyLumi />
      <TryOnSection />
      <GalleryTeaser />
      <Testimonials />
      <BookingCTA />
    </>
  );
}
