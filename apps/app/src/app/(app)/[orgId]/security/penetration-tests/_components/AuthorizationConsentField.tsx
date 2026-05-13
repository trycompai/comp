import { Checkbox } from '@trycompai/design-system';

interface AuthorizationConsentFieldProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  errorMessage?: string;
}

export function AuthorizationConsentField({
  checked,
  onCheckedChange,
  errorMessage,
}: AuthorizationConsentFieldProps) {
  return (
    <label
      htmlFor="pt-authorized"
      className="mb-4 flex cursor-pointer items-start gap-2.5 rounded border border-border bg-muted/30 p-3 text-xs leading-relaxed"
    >
      <Checkbox
        id="pt-authorized"
        checked={checked}
        onCheckedChange={(nextChecked) => onCheckedChange(nextChecked === true)}
        aria-describedby="pt-authorized-help"
      />
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-foreground">
          I own this target or have written authorization to test it.
        </span>
        <span
          id="pt-authorized-help"
          className="mt-0.5 block text-[11px] text-muted-foreground"
        >
          Unauthorized testing may violate applicable computer-misuse laws and your
          provider's terms of service.
        </span>
        {errorMessage && (
          <span className="mt-1 block text-[11px] text-destructive">{errorMessage}</span>
        )}
      </span>
    </label>
  );
}
