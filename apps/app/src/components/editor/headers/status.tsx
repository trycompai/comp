import { Badge } from "@bubba/ui/badge";

interface SaveStatusProps {
  saveStatus: "Saved" | "Saving" | "Unsaved";
}

export function SaveStatus({ saveStatus }: SaveStatusProps) {
  return (
    <div className="mx-auto w-full">
      <div className="flex justify-end">
        <div className="flex items-center gap-1 bg-accent/60 px-2 py-1 rounded-md">
          <span className="text-muted-foreground text-xs">{saveStatus}</span>
        </div>
      </div>
    </div>
  );
}
