import {
  evidenceFormDefinitions,
  type EvidenceFormType,
} from './evidence-forms.definitions';
import {
  GENERIC_UPLOAD_FILE_FIELD_KEY,
  resolveUploadFileFieldKey,
} from './upload-file-field.util';

describe('resolveUploadFileFieldKey', () => {
  it("uses the form's own file field rather than the generic key", () => {
    // The regression this fixes: these three forms declare a file field of
    // their own, so a hardcoded `evidenceFile` left it empty on upload.
    expect(resolveUploadFileFieldKey('penetration-test')).toBe('pentestReport');
    expect(resolveUploadFileFieldKey('network-diagram')).toBe('diagramFile');
    expect(resolveUploadFileFieldKey('rbac-matrix')).toBe('matrixFile');
  });

  it('keeps the generic key for forms that declare it explicitly', () => {
    expect(resolveUploadFileFieldKey('whistleblower-report')).toBe(
      GENERIC_UPLOAD_FILE_FIELD_KEY,
    );
    expect(resolveUploadFileFieldKey('tabletop-exercise')).toBe(
      GENERIC_UPLOAD_FILE_FIELD_KEY,
    );
  });

  it('falls back to the generic key when a form declares no file field', () => {
    expect(resolveUploadFileFieldKey('board-meeting')).toBe(
      GENERIC_UPLOAD_FILE_FIELD_KEY,
    );
    expect(resolveUploadFileFieldKey('access-request')).toBe(
      GENERIC_UPLOAD_FILE_FIELD_KEY,
    );
  });

  it('resolves to a real field key for every form that declares one', () => {
    const formTypes = Object.keys(evidenceFormDefinitions) as EvidenceFormType[];

    for (const formType of formTypes) {
      const resolved = resolveUploadFileFieldKey(formType);
      const fileFields = evidenceFormDefinitions[formType].fields.filter(
        (field) => field.type === 'file',
      );

      if (fileFields.length === 0) {
        expect(resolved).toBe(GENERIC_UPLOAD_FILE_FIELD_KEY);
        continue;
      }

      // The resolved key must name an actual declared file field, otherwise
      // the detail view renders "—" against it.
      expect(fileFields.map((field) => field.key)).toContain(resolved);
    }
  });

  it('prefers a required file field over an optional one', () => {
    const formTypes = Object.keys(evidenceFormDefinitions) as EvidenceFormType[];

    for (const formType of formTypes) {
      const fileFields = evidenceFormDefinitions[formType].fields.filter(
        (field) => field.type === 'file',
      );
      const requiredFileField = fileFields.find((field) => field.required);

      if (requiredFileField) {
        expect(resolveUploadFileFieldKey(formType)).toBe(requiredFileField.key);
      }
    }
  });
});
