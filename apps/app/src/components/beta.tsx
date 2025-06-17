import { cn } from '@comp/ui/cn';

type Props = {
  className?: string;
};

export function Beta({ className }: Props) {
  return (
    <span
      className={cn(
        'border-primary flex h-full items-center rounded-full border px-3 py-[3px] text-[10px] font-normal',
        className,
      )}
    >
      Beta
    </span>
  );
}
