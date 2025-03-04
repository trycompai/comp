import { Badge } from "@bubba/ui/badge";
import Balancer from "react-wrap-balancer";
import Image from "next/image";
import { cn } from "@bubba/ui/cn";

interface WorkflowStepProps {
  stepNumber: number;
  title: string;
  description: string;
  image?: string;
  imagePosition?: "top" | "bottom";
  className?: string;
}

function WorkflowStep({
  stepNumber,
  title,
  description,
  image,
  imagePosition = "bottom",
  className,
}: WorkflowStepProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {imagePosition === "top" && image && (
        <div className="hidden md:flex items-center justify-center w-full h-full relative">
          <Image
            src={image}
            alt={title}
            width={400}
            height={400}
            sizes="(max-width: 400px) 400px, 400px"
            quality={100}
            priority={stepNumber === 1}
            className="object-contain"
          />
        </div>
      )}

      <div className="p-4">
        <div className="text-primary text-xs font-medium">
          STEP {stepNumber}
        </div>
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      {imagePosition === "bottom" && image && (
        <div className="hidden md:flex items-center justify-center w-full h-full relative">
          <Image
            src={image}
            alt={title}
            width={400}
            height={200}
            quality={100}
            priority={stepNumber === 1}
            className="object-contain"
          />
        </div>
      )}

      {/* Image at bottom for small screens only if imagePosition is "bottom" */}
      {image && (
        <div className="md:hidden items-center justify-center flex w-full h-full relative">
          <Image
            src={image}
            alt={title}
            width={400}
            height={400}
            quality={100}
            loading="lazy"
            className="object-contain w-full h-[200px]"
          />
        </div>
      )}
    </div>
  );
}

interface HowItWorksProps {
  title?: string;
  className?: string;
  steps?: WorkflowStepProps[];
}

export default function HowItWorks({
  title = "Integrate & Go",
  className,
  steps = [
    {
      stepNumber: 1,
      title: "Connect your tech stack",
      description:
        "Easily integrate with your existing tools like AWS, GCP, Azure, GitHub, Slack and more.",
      image: "/assets/tech-stack.png",
    },
    {
      stepNumber: 2,
      title: "Get an instant overview",
      description:
        "Get real-time insights into security gaps, misconfigurations, and compliance deviations.",
      image: "/assets/overview.png",
    },
    {
      stepNumber: 3,
      title: "Immediate action",
      description:
        "Receive immediate actions your company can take to help get you compliant.",
      image: "/assets/upload-evidence.png",
    },
    {
      stepNumber: 4,
      title: "Effortless audit preparation",
      description:
        "Generate comprehensive reports and evidence logs for auditors with one click.",
      image: "/assets/export-audit.png",
    },
  ],
}: HowItWorksProps) {
  return (
    <div className={cn("container mx-auto px-8 py-24", className)}>
      <div className="flex flex-col">
        <div className="flex flex-col items-center text-center space-y-6">
          <Badge variant="marketing" className="inline-flex self-center">
            HOW IT WORKS
          </Badge>
          <h2 className="max-w-[700px] text-4xl md:text-5xl leading-tight tracking-tighter lg:leading-[1.1]">
            <Balancer>{title}</Balancer>
          </h2>
        </div>

        <div className="relative mt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 border">
            <div className="flex md:h-full md:border-r border-b md:border-b-0">
              {steps[0] && (
                <WorkflowStep {...steps[0]} imagePosition="bottom" />
              )}
            </div>

            <div className="flex flex-col justify-between md:h-full">
              <div className="border-b">
                {steps[1] && (
                  <WorkflowStep
                    {...steps[1]}
                    imagePosition="top"
                    className="md:block hidden"
                  />
                )}

                {steps[1] && (
                  <WorkflowStep
                    {...steps[1]}
                    className="md:hidden block"
                    imagePosition="bottom"
                  />
                )}
              </div>

              {/* Step 3 - bottom middle */}
              <div className="border-b md:border-none">
                {steps[2] && (
                  <WorkflowStep
                    {...steps[2]}
                    imagePosition="top"
                    className="md:block hidden"
                  />
                )}
                {steps[2] && (
                  <WorkflowStep
                    {...steps[2]}
                    className="md:hidden block"
                    imagePosition="bottom"
                  />
                )}
              </div>
            </div>

            <div className="flex md:h-full md:border-l">
              {steps[3] && (
                <WorkflowStep {...steps[3]} imagePosition="bottom" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
