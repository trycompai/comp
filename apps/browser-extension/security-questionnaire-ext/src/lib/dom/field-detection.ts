import type { DetectedQuestion } from '../types';

export type WritableField =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLElement;

export interface FieldCandidate extends Omit<DetectedQuestion, 'id'> {
  element: WritableField;
}

const FIELD_SELECTOR = [
  'textarea',
  'input:not([type])',
  'input[type="text"]',
  'input[type="search"]',
  'input[type="email"]',
  'input[type="url"]',
  'input[type="tel"]',
  '[contenteditable="true"]',
  '[role="textbox"]',
].join(',');

const SKIP_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'password',
  'radio',
  'range',
  'reset',
  'search',
  'submit',
]);

export function detectQuestionFields(
  root: ParentNode = document,
  options: { visibleOnly?: boolean } = {},
): FieldCandidate[] {
  const visibleOnly = options.visibleOnly ?? true;
  const elements = Array.from(root.querySelectorAll(FIELD_SELECTOR));

  return elements.flatMap((element) => {
    if (!isWritableField(element)) return [];
    if (!isEligibleField(element, visibleOnly)) return [];

    const question = extractQuestionText(element);
    if (!question) return [];

    return [
      {
        element,
        question,
        value: getFieldValue(element),
        isEmpty: getFieldValue(element).trim().length === 0,
        tag: getFieldTag(element),
      },
    ];
  });
}

export function getFieldValue(element: WritableField): string {
  if (element instanceof HTMLInputElement) return element.value;
  if (element instanceof HTMLTextAreaElement) return element.value;
  return element.textContent ?? '';
}

function isWritableField(element: Element): element is WritableField {
  return element instanceof HTMLElement;
}

function isEligibleField(element: WritableField, visibleOnly: boolean): boolean {
  if (element.closest('[data-comp-sq-root="true"]')) return false;
  if (element instanceof HTMLInputElement) {
    const type = element.type.toLowerCase();
    if (SKIP_TYPES.has(type)) return false;
    if (element.disabled || element.readOnly) return false;
  }
  if (element instanceof HTMLTextAreaElement) {
    if (element.disabled || element.readOnly) return false;
  }
  if (isSearchSurface(element)) return false;
  if (isChatOrComposerSurface(element)) return false;
  if (visibleOnly && !isVisible(element)) return false;
  return true;
}

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (element.getClientRects().length === 0) return false;
  return true;
}

function extractQuestionText(element: WritableField): string | null {
  const candidates = [
    getAriaLabelText(element),
    getAssociatedLabelText(element),
    getContainerText(element),
    getPlaceholderText(element),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate);
    if (isGenericAnswerLabel(normalized)) continue;
    if (isQuestionnairePrompt(normalized)) return normalized;
  }
  return null;
}

function getAriaLabelText(element: HTMLElement): string {
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  const labelledBy = element.getAttribute('aria-labelledby');
  if (!labelledBy) return '';

  return labelledBy
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');
}

function getAssociatedLabelText(element: WritableField): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    if (element.labels && element.labels.length > 0) {
      return Array.from(element.labels)
        .map((label) => label.textContent ?? '')
        .join(' ');
    }
  }

  const wrappingLabel = element.closest('label');
  return wrappingLabel?.textContent ?? '';
}

function getPlaceholderText(element: WritableField): string {
  if (element instanceof HTMLInputElement) return element.placeholder;
  if (element instanceof HTMLTextAreaElement) return element.placeholder;
  return '';
}

function getContainerText(element: WritableField): string {
  const container =
    element.closest('tr') ??
    element.closest('[role="listitem"]') ??
    element.closest('[data-item-id]') ??
    element.closest('[jsmodel][data-params]') ??
    element.closest('fieldset') ??
    element.closest('[role="group"]') ??
    element.closest('li') ??
    element.parentElement;

  if (!container) return '';
  return collectReadableText(container, element);
}

function isSearchSurface(element: WritableField): boolean {
  return Boolean(element.closest('[role="search"], form[role="search"]'));
}

function isChatOrComposerSurface(element: WritableField): boolean {
  const directHint = normalizeHint(
    [
      getPlaceholderText(element),
      element.getAttribute('aria-label'),
      element.getAttribute('name'),
      element.getAttribute('id'),
    ].join(' '),
  );
  if (isChatPromptText(directHint)) return true;

  const ancestorHint = getAncestorHintText(element);
  if (isChatComposerHint(ancestorHint)) return true;

  const containerText = normalizeHint(getContainerText(element));
  return isChatPromptText(containerText);
}

function getAncestorHintText(element: WritableField): string {
  const parts: string[] = [];
  let current: Element | null = element;
  let depth = 0;

  while (current && depth < 5) {
    parts.push(
      current.getAttribute('aria-label') ?? '',
      current.getAttribute('role') ?? '',
      current.getAttribute('id') ?? '',
      current.getAttribute('class') ?? '',
      current.getAttribute('data-testid') ?? '',
      current.getAttribute('data-test') ?? '',
      current.getAttribute('data-qa') ?? '',
    );
    current = current.parentElement;
    depth += 1;
  }

  return normalizeHint(parts.join(' '));
}

function normalizeHint(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function isChatPromptText(value: string): boolean {
  return /\b(how can i help|ask (claude|chatgpt|gemini|copilot|assistant|ai|anything)|message (claude|chatgpt|gemini|copilot|assistant|ai)|send a message|write a message|new message|reply to|chat with)\b/i
    .test(value);
}

function isChatComposerHint(value: string): boolean {
  const hasAssistantHint = /\b(assistant|claude|chatgpt|gemini|copilot)\b/i.test(value);
  const hasComposerHint = /\b(chat|composer|compose|conversation|message|prompt|reply)\b/i
    .test(value);
  const hasInputHint = /\b(box|editor|field|form|input|textarea|textbox)\b/i.test(value);
  return (hasAssistantHint && hasComposerHint) || (hasComposerHint && hasInputHint);
}

function collectReadableText(container: Element, field: WritableField): string {
  const doc = container.ownerDocument;
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  let node = walker.nextNode();

  while (node) {
    const parent = node.parentElement;
    if (parent && isReadableTextNode(parent, field)) {
      parts.push(node.textContent ?? '');
    }
    node = walker.nextNode();
  }

  return parts.join(' ');
}

function isReadableTextNode(parent: Element, field: WritableField): boolean {
  if (parent === field || parent.closest('[data-comp-sq-root="true"]')) {
    return false;
  }
  return !parent.closest('button,input,textarea,select,script,style');
}

function getFieldTag(element: WritableField): string {
  if (element instanceof HTMLInputElement) return `input:${element.type}`;
  if (element instanceof HTMLTextAreaElement) return 'textarea';
  if (element.isContentEditable) return 'contenteditable';
  return element.tagName.toLowerCase();
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, 600);
}

function isGenericAnswerLabel(value: string): boolean {
  return /^(answer|your answer|short answer|long answer|paragraph)$/i.test(value);
}

function isQuestionnairePrompt(value: string): boolean {
  if (value.length < 6) return false;
  if (value.includes('?')) return true;
  if (
    /^(are|can|confirm|describe|detail|do|does|explain|have|has|how|identify|is|list|outline|provide|what|where|which|who|will)\b/i
      .test(value)
  ) {
    return true;
  }
  return /\b(access|audit|availability|backup|business continuity|compliance|control|data|disaster recovery|encryption|incident|information security|mfa|password|policy|privacy|risk|soc 2|security|subprocessor|vendor)\b/i
    .test(value);
}
