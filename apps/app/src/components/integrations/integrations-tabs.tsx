"use client";

import { cn } from "@comp/ui/cn";
import { useQueryState } from "nuqs";

const tabs = [
  {
    name: "All",
    value: "all",
  },
  {
    name: "Installed",
    value: "installed",
  },
];

export function AppsTabs() {
  const [currentTab, setTab] = useQueryState("tab", {
    shallow: false,
    defaultValue: "all",
  });

  return (
    <div className="flex border-b">
      {tabs.map((tab) => (
        <button
          onClick={() => setTab(tab.value)}
          key={tab.value}
          type="button"
          className={cn(
            "relative px-4 py-2.5 text-sm font-medium transition-colors",
            "hover:text-foreground/80",
            currentTab === tab.value
              ? "text-foreground"
              : "text-muted-foreground",
          )}
        >
          <span>{tab.name}</span>
          {currentTab === tab.value && (
            <span className="bg-primary absolute right-0 bottom-0 left-0 h-0.5" />
          )}
        </button>
      ))}
    </div>
  );
}
