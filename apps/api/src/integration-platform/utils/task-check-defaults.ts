export function isTaskRunEnabledByDefault(check: unknown): boolean {
  if (!check || typeof check !== 'object') return true;

  const value = (check as { taskRunEnabledByDefault?: unknown })
    .taskRunEnabledByDefault;
  return typeof value === 'boolean' ? value : true;
}
