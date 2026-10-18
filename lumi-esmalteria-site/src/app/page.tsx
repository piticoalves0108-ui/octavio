import { Hero } from "@/sections/home/Hero";
import { BookingCTA, FeaturedServices, GalleryTeaser, MarqueeBand, Testimonials, TryOnSection, WhyLumi } from "@/sections/home/HomeSections";

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
