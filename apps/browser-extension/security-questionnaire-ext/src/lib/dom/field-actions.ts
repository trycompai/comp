import type { WritableField } from './field-detection';

export function insertAnswerIntoField(params: {
  field: WritableField;
  answer: string;
}): void {
  if (params.field instanceof HTMLInputElement) {
    setNativeValue(params.field, params.answer);
    dispatchEditEvents(params.field);
    return;
  }

  if (params.field instanceof HTMLTextAreaElement) {
    setNativeValue(params.field, params.answer);
    dispatchEditEvents(params.field);
    return;
  }

  params.field.textContent = params.answer;
  dispatchEditEvents(params.field);
}

function setNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): void {
  const prototype = Object.getPrototypeOf(element) as
    | HTMLInputElement
    | HTMLTextAreaElement;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  if (descriptor?.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }
}

function dispatchEditEvents(element: HTMLElement): void {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}
