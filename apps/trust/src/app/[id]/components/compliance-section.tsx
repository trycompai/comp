'use client';

import { Badge } from '@comp/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import type { ReactNode } from 'react';
interface ComplianceSectionProps {
  title: string;
  description: string;
  children: ReactNode;
  isLive?: boolean;
  amount?: number;
}

export default function ComplianceSection({
  title,
  description,
  children,
  isLive = false,
  amount,
}: ComplianceSectionProps) {
  return (
    <Card>
      <CardHeader className="border-t-primary gap-4 rounded-t-sm border-t-4 border-b md:gap-0">
        <CardTitle>
          <div className="flex flex-col justify-between md:grid md:grid-cols-2">
            <div className="flex items-center">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                {amount && amount > 0 && <Badge className="text-xs">{amount}</Badge>}
                {title}
              </h2>
              <span className="inline-flex items-center ml-4">
                <span className="w-6 h-6 flex items-center justify-center">
                  <DotLottieReact
                    src="https://lottie.host/e65f14d8-96e8-4ce2-9ad8-5468693a540c/1V8SWnGsv8.lottie"
                    loop
                    autoplay
                    style={{ width: '100%', height: '100%' }}
                  />
                </span>
              </span>
            </div>
          </div>
        </CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 pb-4">{children}</CardContent>
    </Card>
  );
}
