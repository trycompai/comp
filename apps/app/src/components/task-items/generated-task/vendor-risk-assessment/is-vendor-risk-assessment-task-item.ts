import type { TaskItem } from '@/hooks/use-task-items';

const VENDOR_RISK_ASSESSMENT_TASK_TITLE = 'Risk Assessment';
const VENDOR_RISK_ASSESSMENT_INSTRUCTION_SNIPPET =
  'Conduct a risk assessment for this vendor.';

function tryParseJson(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function hasVendorRiskAssessmentMarker(description: string | null | undefined): boolean {
  if (!description) return false;

  const parsed = tryParseJson(description);
  if (!parsed || typeof parsed !== 'object') return false;

  // Structured format (new)
  if ('kind' in parsed && (parsed as { kind?: unknown }).kind === 'vendorRiskAssessmentV1') {
    return true;
  }

  // Legacy TipTap JSON description (old): check first paragraph contains the instruction sentence.
  const type = (parsed as { type?: unknown }).type;
  if (type !== 'doc') return false;

  const content = (parsed as { content?: unknown }).content;
  if (!Array.isArray(content)) return false;

  const firstParagraph = content.find(
    (node) => node && typeof node === 'object' && (node as { type?: unknown }).type === 'paragraph',
  ) as { content?: Array<{ text?: string }> } | undefined;

  const firstText =
    firstParagraph?.content?.find((c) => typeof c?.text === 'string')?.text ?? '';

  return firstText.includes(VENDOR_RISK_ASSESSMENT_INSTRUCTION_SNIPPET);
}

export function isVendorRiskAssessmentTaskItem(taskItem: TaskItem): boolean {
  return (
    taskItem.entityType === 'vendor' &&
    taskItem.title === VENDOR_RISK_ASSESSMENT_TASK_TITLE &&
    hasVendorRiskAssessmentMarker(taskItem.description)
  );
}


