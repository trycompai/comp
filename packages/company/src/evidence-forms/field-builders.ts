import type { EvidenceFormFieldDefinition } from './types';

export function meetingFields(
  minutesPlaceholder: string,
): ReadonlyArray<EvidenceFormFieldDefinition> {
  return [
    {
      key: 'attendees',
      label: 'Attendees',
      type: 'text',
      required: true,
      description: 'Names of all meeting participants',
      placeholder: 'e.g. Jane Doe, John Smith',
    },
    {
      key: 'date',
      label: 'Meeting date',
      type: 'date',
      required: true,
      description: 'Date the meeting was held',
    },
    {
      key: 'meetingMinutes',
      label: 'Meeting minutes',
      type: 'textarea',
      required: true,
      description: 'Full meeting minutes including review and approval of agenda items',
      placeholder: minutesPlaceholder,
    },
    {
      key: 'meetingMinutesApprovedBy',
      label: 'Meeting minutes approved by',
      type: 'text',
      required: true,
      description: 'Person who reviewed and approved the minutes',
      placeholder: 'e.g. Jane Doe, CEO',
    },
    {
      key: 'approvedDate',
      label: 'Approved date',
      type: 'date',
      required: true,
      description: 'Date the minutes were approved',
    },
  ];
}
