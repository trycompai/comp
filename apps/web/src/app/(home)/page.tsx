import { WaitlistForm } from "@/app/components/waitlist-form";
import Balancer from "react-wrap-balancer";
import WhyUs from "../components/why-us";
import OurSolution from "../components/our-solution";
import HowItWorks from "../components/how-it-works";
import CTA from "../components/cta";

export default function Home() {
  return (
    <section className="w-full">
      <div className="container mx-auto px-8 mt-24">
        <div className="flex flex-col items-center text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-medium leading-tight tracking-tighter lg:leading-[1.1] mx-auto">
            <Balancer>Open Source Compliance Automation Platform</Balancer>
          </h1>
          <p className="text-lg md:text-xl font-light text-muted-foreground mt-6 mx-auto">
            <Balancer>
              Get audit ready, fast. Automate compliance with frameworks like
              SOC 2, ISO 27001, and GDPR - in weeks, not months. Open source
              competitor to Drata & Vanta.
            </Balancer>
          </p>
        </div>
      </div>

      <div className="mt-10 container mx-auto px-8 max-w-[550px]">
        <WaitlistForm />
      </div>

      <WhyUs />

      <div className="from-accent/20 to-background bg-gradient-to-b">
        <OurSolution />
      </div>

      <HowItWorks />

      <CTA />
    </section>
  );
}
