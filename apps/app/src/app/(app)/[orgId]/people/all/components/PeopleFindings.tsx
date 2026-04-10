'use client';

import { useState } from 'react';

import { FindingHistoryPanel } from '../../../tasks/[taskId]/components/findings/FindingHistoryPanel';
import { PeopleFindingsList } from './PeopleFindingsList';

export interface PeopleFindingsProps {
  isAuditor: boolean;
  isPlatformAdmin: boolean;
  isAdminOrOwner: boolean;
}

export function PeopleFindings({
  isAuditor,
  isPlatformAdmin,
  isAdminOrOwner,
}: PeopleFindingsProps) {
  const [selectedFindingIdForHistory, setSelectedFindingIdForHistory] = useState<string | null>(
    null,
  );

  return (
    <>
      <PeopleFindingsList
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
