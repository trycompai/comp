import { Badge } from "@bubba/ui/badge";
import Balancer from "react-wrap-balancer";
import { Check, X } from "lucide-react";
import { cn } from "@bubba/ui/cn";

interface ProblemSolutionItemProps {
  text: string;
  isPositive?: boolean;
}

function ProblemSolutionItem({
  text,
  isPositive = false,
}: ProblemSolutionItemProps) {
  return (
    <div className="flex items-start gap-4 py-6 border-t border-border first:border-none">
      <div
        className={cn(
          "p-1 rounded-full mt-0.5",
          isPositive
            ? "bg-primary/10 text-primary border border-primary"
            : "bg-destructive/10 text-destructive",
        )}
      >
        {isPositive ? <Check size={12} /> : <X size={12} />}
      </div>
      <p className={cn("text-md", isPositive ? "" : "text-muted-foreground")}>
        {text}
      </p>
    </div>
  );
}

interface OurSolutionProps {
  title?: string;
  subtitle?: string;
  problems?: Array<{ id: string; text: string }>;
  solutions?: Array<{ id: string; text: string }>;
  className?: string;
}

export default function OurSolution({
  title = "Every framework you need to win deals",
  subtitle = "Most compliance solutions are closed, costly, and complex. We're building an open-source platform to make SOC 2, ISO 27001, and GDPR accessible and affordable.",
  problems = [
    {
      id: "fragmented",
      text: "Compliance processes are fragmented and require multiple tools.",
    },
    {
      id: "costly",
      text: "Traditional solutions are costly and lack transparency.",
    },
    {
      id: "time-consuming",
      text: "Audits are time-consuming and stressful for teams.",
    },
  ],
  solutions = [
    {
      id: "unified",
      text: "Unified Platform: A single dashboard for monitoring, reporting, and compliance automation.",
    },
    {
      id: "open-source",
      text: "Open Source: Full transparency and adaptability with any tech stack.",
    },
    {
      id: "ai-powered",
      text: "AI-Powered Automation: Identify compliance gaps, generate reports, and stay audit-ready effortlessly.",
    },
  ],
  className,
}: OurSolutionProps) {
  return (
    <div className={cn("container mx-auto px-16 py-24", className)}>
      <div className="flex flex-col space-y-8">
        <div>
          <Badge variant="marketing" className="mb-6 inline-flex self-start">
            OUR SOLUTION
          </Badge>
          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <h2 className="text-4xl md:text-5xl leading-tight tracking-tighter lg:leading-[1.1] mb-4">
                <Balancer>{title}</Balancer>
              </h2>
            </div>
            <div>
              <p className="text-muted-foreground md:text-lg">{subtitle}</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12 mt-8">
          <div className="rounded-lg space-y-4">
            <h3 className="text-2xl font-medium border-b border-border pb-4">
              The Problem
            </h3>
            <div>
              {problems.map((problem) => (
                <ProblemSolutionItem
                  key={problem.id}
                  text={problem.text}
                  isPositive={false}
                />
              ))}
            </div>
          </div>

          <div className="rounded-lg space-y-4">
            <h3 className="text-2xl font-medium border-b border-border pb-4">
              Our Solution
            </h3>
            <div>
              {solutions.map((solution) => (
                <ProblemSolutionItem
                  key={solution.id}
                  text={solution.text}
                  isPositive={true}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
