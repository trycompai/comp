import { Badge } from "@bubba/ui/badge";
import Balancer from "react-wrap-balancer";
import ComplianceSection from "./compliance-section";
import Image from "next/image";

const sections = [
  {
    title: "Compliance, finally made easy",
    description:
      "Create your information security program and controls, track, monitor and access risks, and manage your vendors, all from one platform.",
    image: "/assets/compliance-made-easy.png",
    alt: "Compliance progress tracking interface",
  },
  {
    title: "One platform, every framework",
    description:
      "One platform for frameworks like SOC 2, ISO 27001, and GDPR—streamlined compliance, automated with AI & integrations.",
    image: "/assets/one-platform.png",
    alt: "Compliance framework search interface",
  },
  {
    title: "Collect evidence on autopilot",
    description:
      "Automated evidence gathering keeps you compliant, while real-time monitoring catches gaps before they become problems.",
    image: "/assets/evidence.png",
    alt: "Security shield with automation indicators",
  },
];

export default function WhyUs() {
  return (
    <div className="container mx-auto px-8 py-24">
      <div className="flex flex-col items-center text-center space-y-6">
        <Badge variant="marketing">WHY US</Badge>
        <h2 className="text-4xl md:text-5xl leading-tight tracking-tighter lg:leading-[1.1]">
          <Balancer>
            Everything you need to get <br /> compliant, fast.
          </Balancer>
        </h2>
        <p className="text-muted-foreground text-md">
          <Balancer>
            Transparent, automated, and cost-effective compliance powered by
            open source.
          </Balancer>
        </p>
      </div>

      <div className="grid md:grid-cols-3 md:border-b border-border mt-10">
        {sections.map((section, index) => (
          <ComplianceSection
            key={section.title}
            {...section}
            index={index}
            totalItems={sections.length}
          />
        ))}
      </div>

      <div className="grid md:grid-cols-2 items-center">
        <div className="space-y-6 md:border-r md:pr-8 border-border">
          <Image
            src="/assets/enterprise-platform.png"
            alt="Security and Compliance Certifications"
            width={500}
            height={300}
            quality={100}
            className="w-full"
          />
          <div className="space-y-2">
            <h2 className="text-lg font-medium">
              <Balancer>Enterprise platform, low barrier to entry</Balancer>
            </h2>
            <p className="text-muted-foreground text-sm">
              <Balancer>
                Get started with Comp AI in minutes - simply create your account
                & integrate your tech stack to get an instant overview, all
                without frustrating sales calls and upfront annual contracts.
              </Balancer>
            </p>
          </div>
        </div>

        <div className="space-y-6 md:pl-8">
          <Image
            src="/assets/security-and-compliance.png"
            alt="Security and Compliance Certifications"
            width={500}
            height={300}
            quality={100}
            className="w-full"
          />
          <div className="space-y-2">
            <h2 className="text-lg font-medium">
              <Balancer>Security & Compliance</Balancer>
            </h2>
            <p className="text-muted-foreground text-sm">
              <Balancer>
                Automates your journey with frameworks like SOC 2, ISO 27001,
                and GDPR - from start to finish, and beyond - backed by our open
                source community.
              </Balancer>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
