import {
  evidenceFormDefinitions,
  type EvidenceFormType,
} from './evidence-forms.definitions';

/**
 * Key an uploaded file is stored under when the form declares no file field of
 * its own. The submission detail view renders it through a generic
 * "Uploaded Evidence" row, so the file stays reachable.
 */
export const GENERIC_UPLOAD_FILE_FIELD_KEY = 'evidenceFile';

/**
 * The submission-data key an uploaded file must be written to for `formType`.
 *
 * Each form definition declares its own file field — `pentestReport`,
 * `diagramFile`, `matrixFile` — and the submission detail view renders every
 * field by its declared key. Writing every upload to a hardcoded
 * `evidenceFile` therefore stored the file correctly but left the form's real
 * file field empty, so the submission rendered with "—" against every field
 * (including the one the submission schema marks required) while the file
 * appeared only under the generic fallback row.
 *
 * Forms declaring no file field keep the generic key, preserving the existing
 * behaviour for them.
 */
export function resolveUploadFileFieldKey(formType: EvidenceFormType): string {
  const fileFields = evidenceFormDefinitions[formType].fields.filter(
    (field) => field.type === 'file',
  );

  if (fileFields.length === 0) {
    return GENERIC_UPLOAD_FILE_FIELD_KEY;
  }

  // A required file field is the one the submission schema demands, so prefer
  // it when a form declares more than one.
  const target = fileFields.find((field) => field.required) ?? fileFields[0];
  return target.key;
}
