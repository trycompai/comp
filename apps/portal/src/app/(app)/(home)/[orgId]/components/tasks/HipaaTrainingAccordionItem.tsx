'use client';

import {
  HIPAA_TRAINING_ID,
  hipaaAcknowledgements,
  hipaaTrainingSections,
} from '@/lib/data/hipaa-training-content';
import { useTrainingCompletions } from '@/hooks/use-training-completions';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  cn,
} from '@trycompai/design-system';
import { CheckmarkFilled, CircleDash } from '@trycompai/design-system/icons';
import { useState } from 'react';

export function HipaaTrainingAccordionItem() {
  const { completions, markVideoComplete } = useTrainingCompletions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allChecked, setAllChecked] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const hipaaCompletion = completions.find(
    (c) => c.videoId === HIPAA_TRAINING_ID && c.completedAt !== null,
  );
  const isCompleted = !!hipaaCompletion;

  const handleCheckChange = (index: number, checked: boolean) => {
    const updated = { ...checkedItems, [index]: checked };
    setCheckedItems(updated);
    setAllChecked(
      hipaaAcknowledgements.every((_, i) => updated[i] === true),
    );
  };

  const handleAcknowledge = async () => {
    if (!allChecked || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await markVideoComplete(HIPAA_TRAINING_ID);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border rounded-xs">
      <AccordionItem value="hipaa-training">
        <div className="px-4">
          <AccordionTrigger>
            <div className="flex items-center gap-3">
              {isCompleted ? (
                <div className="text-primary">
                  <CheckmarkFilled size={20} />
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <CircleDash size={20} />
                </div>
              )}
              <span
                className={cn(
                  'text-base',
                  isCompleted && 'text-muted-foreground line-through',
                )}
              >
                HIPAA Security Awareness Training
              </span>
            </div>
          </AccordionTrigger>
        </div>
        <AccordionContent>
          <div className="px-4 pb-4 space-y-6">
            <p className="text-muted-foreground text-sm">
              Read the following HIPAA security awareness training and
              acknowledge each statement at the bottom to complete this
              requirement.
            </p>

            {isCompleted ? (
              <CompletedBanner completedAt={hipaaCompletion?.completedAt ?? null} />
            ) : (
              <>
                <TrainingContent />
                <AcknowledgementSection
                  checkedItems={checkedItems}
                  onCheckChange={handleCheckChange}
                  allChecked={allChecked}
                  isSubmitting={isSubmitting}
                  onAcknowledge={handleAcknowledge}
                />
              </>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}

function CompletedBanner({ completedAt }: { completedAt: Date | null }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="text-primary">
        <CheckmarkFilled size={24} />
      </div>
      <div>
        <p className="font-medium text-sm">
          HIPAA training acknowledged
        </p>
        <p className="text-muted-foreground text-xs">
          {completedAt
            ? `Completed on ${new Date(completedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}. A certificate was emailed to you.`
            : 'You have completed the HIPAA Security Awareness Training.'}
        </p>
      </div>
    </div>
  );
}

function TrainingContent() {
  return (
    <div className="space-y-5">
      {hipaaTrainingSections.map((section) => (
        <div key={section.title} className="space-y-2">
          <h3 className="font-semibold text-sm">{section.title}</h3>
          <TrainingSectionContent content={section.content} />
        </div>
      ))}
    </div>
  );
}

function TrainingSectionContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let tableRows: string[][] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (trimmed.replace(/[|\-\s]/g, '') === '') continue;
      inTable = true;
      const cells = trimmed
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());
      tableRows.push(cells);
      continue;
    }

    if (inTable) {
      elements.push(
        <TrainingTable key={`table-${i}`} rows={tableRows} />,
      );
      tableRows = [];
      inTable = false;
    }

    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      elements.push(
        <p key={i} className="font-medium text-sm mt-2">
          {trimmed.slice(2, -2)}
        </p>,
      );
    } else if (trimmed.startsWith('- ')) {
      elements.push(
        <li key={i} className="text-muted-foreground text-sm ml-4 list-disc">
          {trimmed.slice(2)}
        </li>,
      );
    } else if (trimmed) {
      elements.push(
        <p key={i} className="text-muted-foreground text-sm">
          {trimmed}
        </p>,
      );
    }
  }

  if (inTable && tableRows.length > 0) {
    elements.push(
      <TrainingTable key="table-end" rows={tableRows} />,
    );
  }

  return <>{elements}</>;
}

function TrainingTable({ rows }: { rows: string[][] }) {
  if (rows.length === 0) return null;
  const [header, ...body] = rows;

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {header.map((cell, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left font-medium text-foreground"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className="border-b last:border-0">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-3 py-2 text-muted-foreground"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AcknowledgementSection({
  checkedItems,
  onCheckChange,
  allChecked,
  isSubmitting,
  onAcknowledge,
}: {
  checkedItems: Record<number, boolean>;
  onCheckChange: (index: number, checked: boolean) => void;
  allChecked: boolean;
  isSubmitting: boolean;
  onAcknowledge: () => void;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
      <h3 className="font-semibold text-sm">Acknowledgement</h3>
      <p className="text-muted-foreground text-xs">
        By acknowledging this training, you confirm the following:
      </p>
      <div className="space-y-3">
        {hipaaAcknowledgements.map((statement, index) => (
          <label
            key={index}
            className="flex items-start gap-3 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={checkedItems[index] ?? false}
              onChange={(e) => onCheckChange(index, e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary shrink-0"
            />
            <span className="text-sm text-foreground leading-snug">
              {statement}
            </span>
          </label>
        ))}
      </div>
      <div>
        <Button
          disabled={!allChecked || isSubmitting}
          loading={isSubmitting}
          onClick={onAcknowledge}
        >
          Acknowledge HIPAA Training
        </Button>
      </div>
    </div>
  );
}
