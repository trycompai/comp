'use client';

import { Button, Label, Textarea } from '@trycompai/design-system';
import { Play } from '@trycompai/design-system/icons';

interface InstructionComposerFormProps {
  instruction: string;
  onInstructionChange: (value: string) => void;
  criteria: string;
  onCriteriaChange: (value: string) => void;
  testing: boolean;
  canSave: boolean;
  hasResult: boolean;
  isSaving: boolean;
  isStarting: boolean;
  onTest: () => void;
  onSave: () => void;
}

/** Short label → full text inserted on click; keeps the chips compact. */
interface Example {
  label: string;
  value: string;
}

const INSTRUCTION_EXAMPLES: Example[] = [
  {
    label: '2FA policy',
    value: 'Go to Settings → Security and screenshot the two-factor authentication policy.',
  },
  {
    label: 'Password rules',
    value:
      'Open the password policy page and capture the minimum length and complexity requirements.',
  },
  {
    label: 'Admin list',
    value: 'Go to the members page and screenshot the list of users with admin access.',
  },
];

const CHECK_EXAMPLES: Example[] = [
  { label: 'MFA enforced', value: 'Two-factor authentication is enforced for all members.' },
  { label: 'Password length', value: 'The minimum password length is at least 12 characters.' },
  { label: 'Admins approved', value: 'Only approved administrators are listed.' },
];

/** Small PASS / FAIL pill matching the run-history badges. */
function VerdictBadge({ kind }: { kind: 'pass' | 'fail' }) {
  const style =
    kind === 'pass'
      ? {
          background: 'color-mix(in oklab, var(--success) 15%, transparent)',
          color: 'var(--success)',
        }
      : {
          background: 'color-mix(in oklab, var(--destructive) 12%, transparent)',
          color: 'var(--destructive)',
        };
  return (
    <span
      className="rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]"
      style={style}
    >
      {kind === 'pass' ? 'Pass' : 'Fail'}
    </span>
  );
}

/** Clickable starter examples — shown while the field is empty, hidden once typing. */
function ExampleChips({
  examples,
  onPick,
}: {
  examples: Example[];
  onPick: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-muted-foreground">Examples:</span>
      {examples.map((example) => (
        <button
          key={example.label}
          type="button"
          onClick={() => onPick(example.value)}
          className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          {example.label}
        </button>
      ))}
    </div>
  );
}

/** Left column of the split composer: the instruction, a pass/fail check, and
 * the test/save actions (design 1i). */
export function InstructionComposerForm({
  instruction,
  onInstructionChange,
  criteria,
  onCriteriaChange,
  testing,
  canSave,
  hasResult,
  isSaving,
  isStarting,
  onTest,
  onSave,
}: InstructionComposerFormProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border p-6 md:w-[400px] md:flex-none md:border-b-0 md:border-r">
      {/* The h-6 label row + gap-3 mirrors the test panel's header height and
          gap, so this first field lines up with the live browser on the right. */}
      <div className="flex flex-col gap-3">
        <div className="flex h-6 items-center">
          <Label htmlFor="composer-instruction">What should the AI capture?</Label>
        </div>
        <div className="flex flex-col gap-1.5">
          <Textarea
            id="composer-instruction"
            value={instruction}
            onChange={(event) => onInstructionChange(event.target.value)}
            placeholder="Go to Settings → Security and screenshot the two-factor authentication policy."
            rows={3}
          />
          {!instruction.trim() && (
            <ExampleChips examples={INSTRUCTION_EXAMPLES} onPick={onInstructionChange} />
          )}
          <p className="text-[11px] text-muted-foreground">
            Plain English. Where to go, what to capture — goals work too (&ldquo;confirm MFA
            is enforced&rdquo;). The AI finds its own way; you don&apos;t need exact steps.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="composer-criteria">Pass / fail check</Label>
        <div className="flex items-center gap-2">
          <VerdictBadge kind="pass" />
          <span className="text-[11.5px] text-muted-foreground">
            when this is true on the captured page:
          </span>
        </div>
        <Textarea
          id="composer-criteria"
          value={criteria}
          onChange={(event) => onCriteriaChange(event.target.value)}
          placeholder="Two-factor authentication is enforced for all members."
          rows={2}
        />
        {!criteria.trim() && <ExampleChips examples={CHECK_EXAMPLES} onPick={onCriteriaChange} />}
        <div className="flex items-center gap-2">
          <VerdictBadge kind="fail" />
          <span className="text-[11.5px] text-muted-foreground">
            otherwise — recorded automatically.
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Leave blank to only capture a screenshot.
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        {testing ? (
          <Button width="full" disabled loading>
            Testing…
          </Button>
        ) : canSave ? (
          <>
            <Button width="full" onClick={onSave} loading={isSaving} disabled={isSaving}>
              Save instruction
            </Button>
            <Button
              width="full"
              variant="outline"
              onClick={onTest}
              disabled={isStarting}
              iconLeft={<Play size={11} />}
            >
              {hasResult ? 'Run test again' : 'Test instruction'}
            </Button>
          </>
        ) : (
          <>
            <Button
              width="full"
              onClick={onTest}
              disabled={isStarting}
              iconLeft={<Play size={11} />}
            >
              Test instruction
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Watch the AI attempt it before you save.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
