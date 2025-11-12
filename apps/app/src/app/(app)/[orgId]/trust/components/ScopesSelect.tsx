import MultipleSelector from '@comp/ui/multiple-selector';

const SCOPE_OPTIONS = [
  { label: 'customer_data', value: 'customer_data' },
  { label: 'financial_data', value: 'financial_data' },
  { label: 'security_logs', value: 'security_logs' },
  { label: 'audit_reports', value: 'audit_reports' },
  { label: 'compliance_docs', value: 'compliance_docs' },
];

export function ScopesSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <MultipleSelector
      value={value.map((v) => ({ label: v, value: v }))}
      onChange={(options) => onChange(options.map((o) => o.value))}
      options={SCOPE_OPTIONS}
      placeholder="Select scopes..."
      creatable
    />
  );
}
