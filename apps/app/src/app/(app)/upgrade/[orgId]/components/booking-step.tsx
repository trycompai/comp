'use client';

import { Button } from '@comp/ui/button';
import { Card } from '@comp/ui/card';
import { Branch, T, Var } from 'gt-next';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

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
  return (
    <div className="flex justify-center w-full animate-in fade-in-50 duration-500">
      <Card className="w-full max-w-xl border border-gray-100 dark:border-gray-800 shadow-lg shadow-gray-200/30 dark:shadow-black/20 bg-card">
        <div className="p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3 mb-6">
            <T>
              <h1 className="text-2xl font-semibold tracking-tight">
                <Branch
                  branch={hasAccess.toString()}
                  true="Talk to us to upgrade"
                  false={
                    <>
                      Let's get <Var>{company}</Var> approved
                    </>
                  }
                />
              </h1>
            </T>
            <T>
              <p className="text-muted-foreground text-base max-w-xl mx-auto">
                <Branch
                  branch={hasAccess.toString()}
                  true="A quick 20-minute call with our team to understand your compliance needs and upgrade your plan."
                  false="A quick 20-minute call with our team to understand your compliance needs and approve your organization for access."
                />
              </p>
            </T>
          </div>

          {/* CTA Button */}
          <div className="flex justify-center">
            <Link
              href={`https://trycomp.ai/demo?email=${email}&name=${name}&company=${company}&orgId=${orgId}&complianceFrameworks=${complianceFrameworks.join(',')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <T>
                <Button size="lg" className="min-w-[200px]">
                  <Branch branch={hasAccess.toString()} true="Book a Call" false="Book Your Demo" />{' '}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </T>
            </Link>
          </div>

          {/* Already spoke to us section */}
          <div className="border-gray-200 dark:border-gray-800">
            <T>
              <p className="text-center text-sm text-muted-foreground">
                Already had a demo? Ask your point of contact to activate your account.
              </p>
            </T>
          </div>
        </div>
      </Card>
    </div>
  );
}
