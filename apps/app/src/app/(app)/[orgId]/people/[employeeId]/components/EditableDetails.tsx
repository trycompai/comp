'use client';

import { T } from 'gt-next';

interface EditableDetailsProps {
  employeeId: string;
  currentName: string;
  currentEmail: string;
  onSuccess?: () => void;
}

export function EditableDetails({ employeeId, currentName, currentEmail }: EditableDetailsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <T>
          <span className="text-sm font-medium">Name</span>
        </T>
        <span className="text-sm">{currentName}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <T>
          <span className="text-sm font-medium">Email</span>
        </T>
        <span className="text-sm">{currentEmail}</span>
      </div>
    </div>
  );
}
