'use client';

import type { ComponentProps } from 'react';
import { useState } from 'react';

import { FindingScope } from '@db';

import { FindingHistoryPanel } from '../../../tasks/[taskId]/components/findings/FindingHistoryPanel';
import { PeopleFindingsList } from './PeopleFindingsList';

type PeopleFindingsScope = ComponentProps<typeof PeopleFindingsList>['scope'];

export interface PeopleFindingsProps {
  isAuditor: boolean;
  isPlatformAdmin: boolean;
  isAdminOrOwner: boolean;
  /** Defaults to the main People directory scope */
  scope?: PeopleFindingsScope;
}

export function PeopleFindings({
  isAuditor,
  isPlatformAdmin,
  isAdminOrOwner,
  scope = FindingScope.people,
}: PeopleFindingsProps) {
  const [selectedFindingIdForHistory, setSelectedFindingIdForHistory] = useState<string | null>(
    null,
  );

  return (
    <>
      <PeopleFindingsList
        scope={scope}
        isAuditor={isAuditor}
        isPlatformAdmin={isPlatformAdmin}
        isAdminOrOwner={isAdminOrOwner}
        onViewHistory={setSelectedFindingIdForHistory}
      />
      {selectedFindingIdForHistory && (
        <FindingHistoryPanel
          findingId={selectedFindingIdForHistory}
          onClose={() => setSelectedFindingIdForHistory(null)}
        />
      )}
    </>
  );
}
