'use client';

import type { PortalPolicy } from '@/lib/portal-policy-types';
import type { Member } from '@db';
import { Button, Text } from '@trycompai/design-system';
import { ArrowLeft } from '@trycompai/design-system/icons';
import { useState } from 'react';
import { PolicyCarousel } from './PolicyCarousel';
import { PolicyGrid } from './PolicyGrid';

interface PolicyContainerProps {
  policies: PortalPolicy[];
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
          <Button variant="outline" iconLeft={<ArrowLeft size={16} />} onClick={handleBackToGrid}>
            Back to Policies
          </Button>
          <Text variant="muted" size="sm">
            Policy {selectedPolicyIndex + 1} of {policies.length}
          </Text>
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
