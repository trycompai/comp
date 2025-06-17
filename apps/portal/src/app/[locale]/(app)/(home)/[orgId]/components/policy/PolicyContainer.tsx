'use client';

import type { Policy, Member } from '@comp/db/types';
import { useState } from 'react';
import { PolicyGrid } from './PolicyGrid';
import { PolicyCarousel } from './PolicyCarousel';
import { Button } from '@comp/ui/button';
import { ArrowLeft } from 'lucide-react';

interface PolicyContainerProps {
  policies: Policy[];
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
          <Button variant="outline" size="sm" className="gap-2" onClick={handleBackToGrid}>
            <ArrowLeft className="h-4 w-4" />
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
