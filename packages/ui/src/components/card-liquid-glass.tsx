import { cn } from "../utils";
import { Card } from "./card";

interface CardLiquidGlassProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardLiquidGlass = ({
  className,
  ...props
}: CardLiquidGlassProps) => {
  return (
    <Card
      className={cn("bg-card/80 mt-4 backdrop-blur-xs", className)}
      {...props}
    />
  );
};
