import Balancer from "react-wrap-balancer";
import { WaitlistForm } from "./waitlist-form";
import { Badge } from "@bubba/ui/badge";

export default function CTA() {
  return (
    <div className="relative overflow-hidden bg-background py-24">
      <div className="absolute inset-0 z-0 pointer-events-none select-none">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background/40" />
        <div className="absolute inset-0 diagonal-gradient z-1" />

        <div className="absolute inset-0 z-3">
          <div className="absolute inset-0 grid-pattern grid-fade-mask" />
        </div>

        <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-background to-transparent z-4" />
      </div>

      {/* Content layer */}
      <div className="relative z-10">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="flex flex-col items-center text-center space-y-6">
            <Badge variant="marketing">Built for scale</Badge>
            <h2 className="text-4xl md:text-6xl leading-tight tracking-tighter lg:leading-[1.1] mx-auto">
              <Balancer>Ready to get compliant?</Balancer>
            </h2>
            <p className="text-lg md:text-lg text-muted-foreground mt-6 mx-auto">
              <Balancer>
                Start your compliance journey today and join thousands of
                companies building trust through transparent, automated
                compliance.
              </Balancer>
            </p>
          </div>

          <div className="mt-10 relative z-20 mx-auto max-w-[450px]">
            <WaitlistForm />
          </div>
        </div>
      </div>
    </div>
  );
}
