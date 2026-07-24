import type { LoginAnalysis } from '../../hooks/types';

/** A field the capture form renders, mapped back to the sign-in contract on submit. */
export type CaptureFieldKind = 'identifier' | 'password' | 'text';

export interface CaptureField {
  label: string;
  kind: CaptureFieldKind;
  /** True when the user can rename the label (manual / user-added fields). */
  editableLabel?: boolean;
}

export interface DerivedCapture {
  fields: CaptureField[];
  /** Detection was unusable → generic form + "add a field" escape hatch. */
  manual: boolean;
}

// A detected pre-password field whose label reads like the login identifier
// (e.g. AWS "IAM username") — we treat it AS the identifier instead of showing a
// separate generic "Username or email" that would duplicate it.
const IDENTIFIER_HINT = /(user\s?name|user|e-?mail|login\s?id|login)/i;

function identifierLabel(identifierType?: string): string {
  if (identifierType === 'email') return 'Email';
  if (identifierType === 'username') return 'Username';
  return 'Username or email';
}

function genericManual(): DerivedCapture {
  return {
    manual: true,
    fields: [
      { label: 'Username or email', kind: 'identifier' },
      { label: 'Password', kind: 'password' },
    ],
  };
}

/**
 * Build the capture form's fields from what we detected on the vendor's sign-in
 * page (designer option 1A — the form IS the detected fields, in order, with the
 * vendor's own labels). Falls back to a generic username/password form when
 * detection can't be trusted, so nothing is ever a dead end.
 */
export function deriveCaptureFields(analysis: LoginAnalysis | null | undefined): DerivedCapture {
  const extras = analysis?.extraFields ?? [];
  const reachable = analysis?.reachable ?? false;
  const hasPassword = analysis?.detectedMethods?.includes('password') ?? false;

  // Nothing usable read from the page → generic manual form.
  if (!analysis || !reachable || (!hasPassword && extras.length === 0)) {
    return genericManual();
  }

  const fields: CaptureField[] = [];
  let identifierTaken = false;
  // Detected fields come before the password, in the vendor's order. One of them
  // may be the identifier itself — promote the first such match so we don't also
  // render a redundant generic identifier field.
  for (const extra of extras) {
    if (!identifierTaken && IDENTIFIER_HINT.test(extra.label)) {
      fields.push({ label: extra.label, kind: 'identifier' });
      identifierTaken = true;
    } else {
      fields.push({ label: extra.label, kind: 'text' });
    }
  }
  if (!identifierTaken) {
    fields.push({ label: identifierLabel(analysis.identifierType), kind: 'identifier' });
  }
  fields.push({ label: 'Password', kind: 'password' });

  return { manual: false, fields };
}
