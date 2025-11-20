"use client";

import { Code, Code2 } from "lucide-react";

interface Props {
  type: "automation" | "workflow";
}

export function EmptyState({ type }: Props) {
  if (type === "automation") {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex max-w-sm flex-col items-center gap-2 text-center">
          <Code className="text-muted-foreground/60 h-10 w-10 text-center" />
          <div className="flex flex-col items-center">
            <h3 className="text-foreground text-lg font-semibold">
              No Integration Yet
            </h3>
            <p className="text-muted-foreground text-sm">
              Chat with the Comp AI agent to build your integration.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="bg-muted/30 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
          <Code2 className="text-muted-foreground h-8 w-8" />
        </div>
        <p className="text-muted-foreground">No integration steps found</p>
      </div>
    </div>
  );
}
