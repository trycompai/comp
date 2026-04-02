'use client';

import { Button } from '@trycompai/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@trycompai/ui/card';
import { Dialog } from '@trycompai/ui/dialog';
import { ScrollArea } from '@trycompai/ui/scroll-area';
import type { FrameworkEditorFramework } from '@db';
import { Add } from '@trycompai/design-system/icons';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import type { FrameworkInstanceWithControls } from '@/lib/types/framework';
import { AddFrameworkModal } from './AddFrameworkModal';
import type { FrameworkInstanceWithComplianceScore } from './types';

export interface FrameworksOverviewProps {
  frameworksWithControls: FrameworkInstanceWithControls[];
  allFrameworks: FrameworkEditorFramework[];
  frameworksWithCompliance?: FrameworkInstanceWithComplianceScore[];
  organizationId?: string;
  overallComplianceScore: number;
}

export function mapFrameworkToBadge(framework: FrameworkInstanceWithControls) {
  if (framework.framework.name === 'SOC 2') {
    return '/badges/soc2.svg';
  }

  if (framework.framework.name === 'ISO 27001') {
    return '/badges/iso27001.svg';
  }

  if (framework.framework.name === 'ISO 42001') {
    return '/badges/iso42001.svg';
  }

  if (framework.framework.name === 'HIPAA') {
    return '/badges/hipaa.svg';
  }

  if (framework.framework.name === 'GDPR') {
    return '/badges/gdpr.svg';
  }

  if (framework.framework.name === 'PCI DSS') {
    return '/badges/pci-dss.svg';
  }

  if (framework.framework.name === 'NEN 7510') {
    return '/badges/nen7510.svg';
  }

  if (framework.framework.name === 'ISO 9001') {
    return '/badges/iso9001.svg';
  }

  return null;
}

export function FrameworksOverview({
  frameworksWithControls,
  frameworksWithCompliance,
  overallComplianceScore,
  allFrameworks,
  organizationId,
}: FrameworksOverviewProps) {
  const [isAddFrameworkModalOpen, setIsAddFrameworkModalOpen] = useState(false);
  const { hasPermission } = usePermissions();
  const { orgId } = useParams<{ orgId: string }>();

  const complianceMap = new Map(
    frameworksWithCompliance?.map((f) => [f.frameworkInstance.id, f.complianceScore]) ?? [],
  );

  const availableFrameworksToAdd = allFrameworks.filter(
    (framework) => !frameworksWithControls.some((fc) => fc.framework.id === framework.id),
  );

  return (
    <Card className="flex flex-col overflow-hidden border h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">{'Frameworks'}</CardTitle>
        </div>

        <div className="bg-secondary/50 relative mt-2 h-1 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-all"
            style={{
              width: `${overallComplianceScore}%`,
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col">
        <div className="h-[300px]">
          <ScrollArea className="h-full">
            <div className="space-y-0 pr-4">
              {frameworksWithControls.map((framework, index) => {
                const complianceScore = complianceMap.get(framework.id) ?? 0;
                const badgeSrc = mapFrameworkToBadge(framework);

                return (
                  <div key={framework.id}>
                    <Link
                      href={`/${orgId}/frameworks/${framework.id}`}
                      className="block hover:bg-muted/50 rounded-md transition-colors"
                    >
                      <div className="flex items-start justify-between py-4 px-1">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="shrink-0 mt-1">
                            {badgeSrc ? (
                              <Image
                                src={badgeSrc}
                                alt={framework.framework.name}
                                width={32}
                                height={32}
                                className="rounded-full w-8 h-8"
                                unoptimized
                              />
                            ) : (
                              <div className="rounded-full w-8 h-8 bg-muted flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">
                                  {framework.framework.name.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground flex flex-col">
                              {framework.framework.name}
                              <span className="text-xs text-muted-foreground font-normal">
                                {framework.framework.description?.trim()}
                              </span>
                            </span>

                            <div className="flex flex-col mt-1.5">
                              <div className="w-full bg-muted/50 rounded-full h-1">
                                <div
                                  className="bg-primary h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${complianceScore}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground tabular-nums text-right mt-1">
                                {Math.round(complianceScore)}% compliant
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                    {index < frameworksWithControls.length - 1 && (
                      <div className="border-t border-muted/30" />
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </CardContent>

      {hasPermission('framework', 'create') && (
        <CardFooter className="mt-auto">
          <div className="flex justify-center w-full">
            <Button variant="outline" onClick={() => setIsAddFrameworkModalOpen(true)}>
              <Add size={16} className="mr-2" />
              Add Framework
            </Button>
          </div>
        </CardFooter>
      )}

      <Dialog open={isAddFrameworkModalOpen} onOpenChange={setIsAddFrameworkModalOpen}>
        {isAddFrameworkModalOpen && (
          <AddFrameworkModal
            onOpenChange={setIsAddFrameworkModalOpen}
            availableFrameworks={availableFrameworksToAdd}
            organizationId={organizationId}
          />
        )}
      </Dialog>
    </Card>
  );
}
