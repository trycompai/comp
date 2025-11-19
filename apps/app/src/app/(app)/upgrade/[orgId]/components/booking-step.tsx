'use client';

import { Button } from '@trycompai/ui/button';
import { Card } from '@trycompai/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@trycompai/ui/tooltip';
import { ArrowRight, Check, Copy } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

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

  const title = !hasAccess ? `Let's get ${company} approved` : 'Talk to us to upgrade';

  const description = !hasAccess
    ? `A quick 20-minute call with our team to understand your compliance needs and approve your organization for access.`
    : `A quick 20-minute call with our team to understand your compliance needs and upgrade your plan.`;

  const cta = !hasAccess ? 'Book Your Demo' : 'Book a Call';

  const handleCopyOrgId = async () => {
    if (isCopied) return;

    try {
      await navigator.clipboard.writeText(orgId);
      setIsCopied(true);
      toast.success('Org ID copied to clipboard');

      // Reset after 3 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 3000);
    } catch (error) {
      toast.error('Failed to copy Org ID');
    }
  };

  return (
    <div className="flex justify-center w-full animate-in fade-in-50 duration-500">
      <Card className="w-full max-w-xl border border-gray-100 dark:border-gray-800 shadow-lg shadow-gray-200/30 dark:shadow-black/20 bg-card">
        <div className="p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3 mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">{description}</p>
          </div>

          {/* Org ID Display with Copy Button */}
          <div className="flex items-center justify-center mb-4">
            <span className="text-xs font-mono px-3 rounded-sm border bg-background border-input text-foreground select-all flex items-center h-9 border-r-0 rounded-tr-none rounded-br-none">
              Org ID: {orgId}
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="text-xs rounded-tl-none rounded-bl-none"
                    onClick={handleCopyOrgId}
                    aria-label={isCopied ? 'Copied!' : 'Copy Org ID'}
                  >
                    {isCopied ? (
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{isCopied ? 'Copied!' : 'Copy Org ID'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* CTA Button */}
          <div className="flex justify-center">
            <Link
              href={`https://trycomp.ai/demo?email=${email}&name=${name}&company=${company}&orgId=${orgId}&complianceFrameworks=${complianceFrameworks.join(',')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="min-w-[200px]">
                {cta} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Already spoke to us section */}
          <div className="border-gray-200 dark:border-gray-800">
            <p className="text-center text-sm text-muted-foreground">
              Already had a demo? Ask your point of contact to activate your account.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
