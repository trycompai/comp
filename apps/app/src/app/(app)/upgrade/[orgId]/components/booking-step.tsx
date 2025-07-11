'use client';

import { Button } from '@comp/ui/button';
import { Card } from '@comp/ui/card';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function BookingStep({
  email,
  name,
  company,
  orgId,
  complianceFrameworks,
}: {
  email: string;
  name: string;
  company: string;
  orgId: string;
  complianceFrameworks: string[];
}) {
  return (
    <div className="flex justify-center w-full animate-in fade-in-50 duration-500">
      <Card className="w-full max-w-xl border border-gray-100 dark:border-gray-800 shadow-lg shadow-gray-200/30 dark:shadow-black/20 bg-card">
        <div className="p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3 mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              Let's get {company || 'your organization'} approved
            </h1>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">
              A quick 20-minute call with our team to understand your compliance needs and approve
              your organization for access.
            </p>
          </div>

          {/* CTA Button */}
          <div className="flex justify-center">
            <Link
              href={`https://trycomp.ai/demo?email=${email}&name=${name}&company=${company}&orgId=${orgId}&complianceFrameworks=${complianceFrameworks.join(',')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="min-w-[200px]">
                Book Your Demo <ArrowRight className="w-4 h-4" />
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
