'use client';

import { Button, Input, Label, Textarea } from '@trycompai/design-system';
import { Checkmark, ChevronRight, Play } from '@trycompai/design-system/icons';
import type { ConnectionRef } from './InstructionComposer';

interface InstructionComposerFormProps {
  connection: ConnectionRef;
  instruction: string;
  onInstructionChange: (value: string) => void;
  checkEnabled: boolean;
  onToggleCheck: () => void;
  criteria: string;
  onCriteriaChange: (value: string) => void;
  advancedOpen: boolean;
  onToggleAdvanced: () => void;
  startUrl: string;
  onStartUrlChange: (value: string) => void;
  testing: boolean;
  canSave: boolean;
  hasResult: boolean;
  isSaving: boolean;
  isStarting: boolean;
  onTest: () => void;
  onSave: () => void;
}

/** Left column of the split composer: the instruction, an optional check, an
 * advanced start URL, and the test/save actions (design 1i). */
export function InstructionComposerForm({
  connection,
  instruction,
  onInstructionChange,
  checkEnabled,
  onToggleCheck,
  criteria,
  onCriteriaChange,
  advancedOpen,
  onToggleAdvanced,
  startUrl,
  onStartUrlChange,
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="composer-instruction">What should the AI capture?</Label>
        <Textarea
          id="composer-instruction"
          value={instruction}
          onChange={(event) => onInstructionChange(event.target.value)}
          placeholder="Go to Settings → Security and screenshot the two-factor authentication policy."
          rows={3}
        />
        <p className="text-[11px] text-muted-foreground">
          Plain English. Where to go, what to capture — goals work too (&ldquo;confirm MFA
          is enforced&rdquo;).
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={onToggleCheck}
          className="flex items-center gap-2 text-left"
        >
          <span
            className="grid h-3.5 w-3.5 place-items-center rounded-sm border"
            style={
              checkEnabled
                ? {
                    background: 'var(--primary)',
                    borderColor: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                  }
                : { borderColor: 'var(--input)' }
            }
          >
            {checkEnabled && <Checkmark size={9} />}
          </span>
          <span className="text-[12.5px] text-foreground">Add a pass / fail check</span>
          <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            Optional
          </span>
        </button>
        {checkEnabled && (
          <>
            <Textarea
              id="composer-criteria"
              value={criteria}
              onChange={(event) => onCriteriaChange(event.target.value)}
              placeholder="Two-factor authentication is enforced for all members."
              rows={2}
            />
            <p className="text-[11px] text-muted-foreground">
              Each run, the AI judges the captured page against this sentence and records
              PASS or FAIL.
            </p>
          </>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={onToggleAdvanced}
          className="flex items-center gap-1 text-left text-xs text-primary"
        >
          Advanced — start from a specific page
          <ChevronRight
            size={12}
            className={advancedOpen ? 'rotate-90 transition-transform' : 'transition-transform'}
          />
        </button>
        {advancedOpen && (
          <>
            <Input
              id="composer-start-url"
              value={startUrl}
              onChange={(event) => onStartUrlChange(event.target.value)}
              placeholder={connection.url}
            />
            <p className="text-[11px] text-muted-foreground">
              Defaults to {connection.hostname}. Override only if the AI should start on a
              deeper page.
            </p>
          </>
        )}
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
