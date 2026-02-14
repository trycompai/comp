import type { EvidenceFormType } from './form-types';

export type EvidenceFormMatrixColumnDefinition = {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  description?: string;
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
};

export type EvidenceFormDefinition = {
  type: EvidenceFormType;
  title: string;
  description: string;
  category: string;
  submissionDateMode: 'custom' | 'auto';
  portalAccessible: boolean;
  fields: ReadonlyArray<EvidenceFormFieldDefinition>;
};
