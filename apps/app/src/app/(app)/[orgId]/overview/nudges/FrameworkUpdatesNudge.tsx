'use client';

import { useFrameworkUpdateStatuses } from '@/hooks/use-framework-update-statuses';
import { FrameworkUpdatesCard } from '../components/FrameworkUpdatesCard';
import type { NudgeState } from './types';

export function useFrameworkUpdatesNudge(): NudgeState {
  const { data: statuses, error } = useFrameworkUpdateStatuses();

  return {
    id: 'framework-updates',
    // Last: after offboarding (10) and trust-portal-setup (20) — least urgent.
    priority: 30,
    // The card has no dismiss control; keep false so the id stays out of the
    // host's persistableIds (no spurious localStorage read for an undismissable nudge).
    persistDismissal: false,
    // Only "not ready" while the fetch is genuinely in flight (mirrors offboarding).
    ready: statuses !== undefined || error !== undefined,
    // Eligible only when the fetch succeeded and there's at least one update.
    eligible: !error && Array.isArray(statuses) && statuses.length > 0,
    // The card keeps its own look and has no dismiss affordance, so ignore onDismiss.
    render: () => <FrameworkUpdatesCard />,
  };
}
