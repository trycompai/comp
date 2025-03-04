"use client";

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@bubba/ui/carousel";
import * as React from "react";
import { SectionMarket } from "./pitch-market";
import { SectionMission } from "./pitch-mission";
import { PitchNavigation } from "./pitch-navigation";
import { SectionProblem } from "./pitch-problem";
import { SectionSolution } from "./pitch-solution";
import { SectionStart } from "./pitch-start";
import { SectionTeam } from "./pitch-team";
import { SectionTraction } from "./pitch-traction";

const slides = [
  { component: SectionStart, title: "Start" },
  { component: SectionMission, title: "Mission" },
  { component: SectionProblem, title: "The Problem" },
  { component: SectionSolution, title: "The Solution" },
  { component: SectionMarket, title: "Market" },
  { component: SectionTraction, title: "Traction" },
  { component: SectionTeam, title: "Team" },
];

export function PitchCarousel() {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <div className="relative w-full h-full">
        <Carousel
          setApi={setApi}
          className="w-full h-full"
          opts={{
            align: "start",
            loop: true,
          }}
        >
          <CarouselContent className="-ml-0">
            {slides.map(({ component: SlideComponent }, index) => (
              <CarouselItem
                key={`slide-${index + 1}`}
                className="pl-0 basis-full"
              >
                <SlideComponent />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Navigation Overlay */}
        <div className="fixed bottom-0 left-0 right-0 pb-4 sm:pb-8 bg-gradient-to-t from-background to-transparent pointer-events-none">
          <div className="pointer-events-auto">
            <PitchNavigation
              totalSlides={slides.length}
              currentSlide={current}
              onNavigate={(index) => api?.scrollTo(index)}
            />
          </div>
        </div>
      </div>
    </React.Suspense>
  );
}
