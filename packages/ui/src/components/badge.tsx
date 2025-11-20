import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "../utils";

const badgeVariants = cva(
  "focus:ring-ring relative inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/80 border-transparent",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-transparent",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/80 border-transparent",
        outline: "text-foreground",
        tag: "text-muted-foreground bg-accent dark:bg-accent hover:bg-accent/70 rounded-sm border-none font-mono text-[10px]",
        marketing:
          "bg-primary/10 text-primary hover:bg-primary/5 before:bg-primary flex items-center gap-2 border px-3 font-mono whitespace-nowrap opacity-80 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-0.5 before:content-['']",
        warning: "bg-warning hover:bg-warning/80 border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
