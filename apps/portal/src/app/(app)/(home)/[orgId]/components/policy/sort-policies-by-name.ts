type NamedPolicy = {
  id: string;
  name: string;
};

const POLICY_NAME_COLLATOR = new Intl.Collator(undefined, { sensitivity: 'base' });

export function sortPoliciesByName<T extends NamedPolicy>(
  policies: T[],
): T[] {
  return [...policies].sort((a, b) => {
    const byName = POLICY_NAME_COLLATOR.compare(a.name, b.name);
    if (byName !== 0) {
      return byName;
    }

    return a.id.localeCompare(b.id);
  });
}
