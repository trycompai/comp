import { cn } from "@/lib/utils";

import { Loader } from "../../../components/ai-elements/loader";

export function Spinner({
  className,
  loading,
  children,
}: {
  className?: string;
  loading: boolean;
  children?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center",
        className,
      )}
    >
      {loading ? <Loader /> : children}
    </span>
  );
}
