import type { TaskStatus } from "@comp/db/types";
import { cn } from "@comp/ui/cn";
import { Check, Circle, CircleX, Loader2 } from "lucide-react";
import { STATUS_COLORS } from "@/components/status-indicator";

interface TaskStatusIndicatorProps {
  status: TaskStatus;
  className?: string;
}

// Helper to get border/bg color based on status (adapted from TaskCard logic if needed)
// This needs refinement based on actual desired classes/colors from your design system
function getStatusColorClasses(status: TaskStatus): string {
  // Using STATUS_COLORS for border color, adding light background potentially
  const borderColor = STATUS_COLORS[status] ?? "#808080";
  // Example background (10% opacity) - this might not map directly to Tailwind, adjust if needed
  const bgColorStyle = `${borderColor}1A`;

  // If using Tailwind JIT, you might need to configure safelisting or use inline styles
  // For simplicity here, we'll return classes assuming colors are defined or use inline style
  // This part likely needs adjustment based on your Tailwind setup/conventions.
  switch (status) {
    case "todo":
      // Example using direct color - needs adjustment if using theme colors
      return "border-[#6b7280] bg-[#6b7280]/10"; // Grayish
    case "in_progress":
      return "border-[#ffc107] bg-[#ffc107]/10"; // Yellowish
    case "done":
      return "border-[#00DC73] bg-[#00DC73]/10"; // Greenish
    default:
      return "border-[#6b7280] bg-[#6b7280]/10"; // Default Grayish
  }
}

export function TaskStatusIndicator({
  status,
  className,
}: TaskStatusIndicatorProps) {
  const colorClasses = getStatusColorClasses(status);

  return (
    <div className={cn("shrink-0", className)}>
      {status === "todo" && (
        <Circle className="size-4 text-[#6b7280]" strokeWidth={1.5} />
      )}
      {status === "in_progress" && (
        <Loader2 className="size-4 text-[#ffc107]" strokeWidth={1.5} />
      )}
      {status === "done" && (
        <Check className="size-4 text-[#00DC73]" strokeWidth={1.5} />
      )}
      {status === "not_relevant" && (
        <CircleX className="size-4 text-[#ff0000]" strokeWidth={1.5} />
      )}
    </div>
  );
}
