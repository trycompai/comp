import { Loader2Icon } from 'lucide-react';

function Spinner({ ...props }: Omit<React.ComponentProps<'svg'>, 'className'>) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className="size-4 shrink-0 animate-spin"
      {...props}
    />
  );
}

export { Spinner };
