type NamedPolicy = {
  id: string;
  name: string;
};

const POLICY_NAME_COLLATOR = new Intl.Collator(undefined, { sensitivity: 'base' });

export function comparePoliciesByName(
  a: NamedPolicy,
  b: NamedPolicy,
): number {
  const byName = POLICY_NAME_COLLATOR.compare(a.name, b.name);
  if (byName !== 0) {
    return byName;
  }

  return a.id.localeCompare(b.id);
}
