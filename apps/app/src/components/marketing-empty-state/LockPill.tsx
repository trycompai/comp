import { Locked } from '@trycompai/design-system/icons';

interface LockPillProps {
  label: string;
}

export function LockPill({ label }: LockPillProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm bg-primary/12 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-primary">
      <Locked size={11} />
      {label}
    </span>
  );
}
