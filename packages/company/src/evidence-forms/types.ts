import type { EvidenceFormType } from './form-types';

export type EvidenceFormMatrixColumnDefinition = {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  description?: string;
  // Defaults to a free-text input. Set to 'select' to render a dropdown
  // picklist using `options`.
  type?: 'text' | 'select';
  options?: ReadonlyArray<{ label: string; value: string }>;
};

export type EvidenceFormFieldDefinition = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'select' | 'file' | 'matrix';
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: ReadonlyArray<{ label: string; value: string }>;
  accept?: string;
  columns?: ReadonlyArray<EvidenceFormMatrixColumnDefinition>;
  addRowLabel?: string;
  // Matrix only: rows the form is pre-seeded with (keyed by column key).
  defaultRows?: ReadonlyArray<Readonly<Record<string, string>>>;
};

export type EvidenceFormDefinition = {
  type: EvidenceFormType;
  title: string;
  description: string;
  category: string;
  submissionDateMode: 'custom' | 'auto';
  portalAccessible: boolean;
  fields: ReadonlyArray<EvidenceFormFieldDefinition>;
  optional?: boolean;
  hidden?: boolean;
};
