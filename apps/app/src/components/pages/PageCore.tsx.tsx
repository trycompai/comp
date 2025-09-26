import { cn } from '@/lib/utils';
import { CardLiquidGlass } from '@comp/ui/card-liquid-glass';

export default function PageCore({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <CardLiquidGlass className={cn('flex flex-col gap-4 rounded-lg p-4', className)}>
      {children}
    </CardLiquidGlass>
  );
}
