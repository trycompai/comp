'use client';

import type { Member, Policy, PolicyVersion } from '@db';
import { Button } from '@trycompai/design-system';
import { ArrowLeft } from '@trycompai/design-system/icons';
import { useState } from 'react';
import { PolicyCarousel } from './PolicyCarousel';
import { PolicyGrid } from './PolicyGrid';

type PolicyWithVersion = Policy & {
  currentVersion?: Pick<PolicyVersion, 'id' | 'content' | 'pdfUrl' | 'version'> | null;
};

interface PolicyContainerProps {
  policies: PolicyWithVersion[];
  member: Member;
}

export function PolicyContainer({ policies, member }: PolicyContainerProps) {
  const [selectedPolicyIndex, setSelectedPolicyIndex] = useState<number | null>(null);

  const handlePolicyClick = (index: number) => {
    setSelectedPolicyIndex(index);
  };

  const handleBackToGrid = () => {
    setSelectedPolicyIndex(null);
  };

  const handleIndexChange = (index: number) => {
    setSelectedPolicyIndex(index);
  };

  if (selectedPolicyIndex !== null) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToGrid}
            iconLeft={<ArrowLeft size={16} />}
          >
            Back to Policies
          </Button>
          <p className="text-muted-foreground text-sm">
            Policy {selectedPolicyIndex + 1} of {policies.length}
          </p>
        </div>
        <PolicyCarousel
          policies={policies}
          member={member}
          initialIndex={selectedPolicyIndex}
          onIndexChange={handleIndexChange}
        />
      </div>
    );
  }

  return <PolicyGrid policies={policies} onPolicyClick={handlePolicyClick} member={member} />;
}
