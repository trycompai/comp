import { CardLiquidGlass } from '@comp/ui/card-liquid-glass';

export default function PageCore({ children }: { children: React.ReactNode }) {
  return (
    <CardLiquidGlass className="flex flex-col gap-4 rounded-lg p-4">{children}</CardLiquidGlass>
  );
}
