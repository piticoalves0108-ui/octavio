import { Hero } from "@/sections/home/Hero";
import { MarqueeBand } from "@/sections/home/MarqueeBand";
import { Manifesto } from "@/sections/home/Manifesto";
import { FeaturedRooms } from "@/sections/home/FeaturedRooms";
import { WhyUs } from "@/sections/home/WhyUs";
import { BeforeAfterSection } from "@/sections/home/BeforeAfterSection";
import { MaterialsSection } from "@/sections/home/MaterialsSection";
import { ProcessSection } from "@/sections/home/ProcessSection";
import { ProjectsGallery } from "@/sections/home/ProjectsGallery";
import { TourTeaser } from "@/sections/home/TourTeaser";
import { Testimonials } from "@/sections/home/Testimonials";
import { CTASection } from "@/sections/home/CTASection";

export default function HomePage() {
  return (
    <>
      <Hero />
      <MarqueeBand />
      <Manifesto />
      <FeaturedRooms />
      <WhyUs />
      <BeforeAfterSection />
      <MaterialsSection />
      <ProcessSection />
      <ProjectsGallery />
      <TourTeaser />
      <Testimonials />
      <CTASection />
    </>
  );
}
