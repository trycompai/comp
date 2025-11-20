"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@trycompai/ui/button";
import { Card } from "@trycompai/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@trycompai/ui/tooltip";

export function BookingStep({
  email,
  name,
  company,
  orgId,
  complianceFrameworks,
  hasAccess,
}: {
  email: string;
  name: string;
  company: string;
  orgId: string;
  complianceFrameworks: string[];
  hasAccess: boolean;
}) {
  const [isCopied, setIsCopied] = useState(false);

  const title = !hasAccess
    ? `Let's get ${company} approved`
    : "Talk to us to upgrade";

  const description = !hasAccess
    ? `A quick 20-minute call with our team to understand your compliance needs and approve your organization for access.`
    : `A quick 20-minute call with our team to understand your compliance needs and upgrade your plan.`;

  const cta = !hasAccess ? "Book Your Demo" : "Book a Call";

  const handleCopyOrgId = async () => {
    if (isCopied) return;

    try {
      await navigator.clipboard.writeText(orgId);
      setIsCopied(true);
      toast.success("Org ID copied to clipboard");

      // Reset after 3 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 3000);
    } catch (error) {
      toast.error("Failed to copy Org ID");
    }
  };

  return (
    <div className="animate-in fade-in-50 flex w-full justify-center duration-500">
      <Card className="bg-card w-full max-w-xl border border-gray-100 shadow-lg shadow-gray-200/30 dark:border-gray-800 dark:shadow-black/20">
        <div className="space-y-8 p-8">
          {/* Header */}
          <div className="mb-6 space-y-3 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted-foreground mx-auto max-w-xl text-base">
              {description}
            </p>
          </div>

          {/* Org ID Display with Copy Button */}
          <div className="mb-4 flex items-center justify-center">
            <span className="bg-background border-input text-foreground flex h-9 items-center rounded-sm rounded-tr-none rounded-br-none border border-r-0 px-3 font-mono text-xs select-all">
              Org ID: {orgId}
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="rounded-tl-none rounded-bl-none text-xs"
                    onClick={handleCopyOrgId}
                    aria-label={isCopied ? "Copied!" : "Copy Org ID"}
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {isCopied ? "Copied!" : "Copy Org ID"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* CTA Button */}
          <div className="flex justify-center">
            <Link
              href={`https://trycomp.ai/demo?email=${email}&name=${name}&company=${company}&orgId=${orgId}&complianceFrameworks=${complianceFrameworks.join(",")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="min-w-[200px]">
                {cta} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Already spoke to us section */}
          <div className="border-gray-200 dark:border-gray-800">
            <p className="text-muted-foreground text-center text-sm">
              Already had a demo? Ask your point of contact to activate your
              account.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
