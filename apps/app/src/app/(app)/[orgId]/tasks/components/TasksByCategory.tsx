"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Folder } from "lucide-react";

import type { Member, Task, User } from "@trycompai/db";

import { AutomationIndicator } from "./AutomationIndicator";
import { TaskStatusSelector } from "./TaskStatusSelector";

interface TasksByCategoryProps {
  tasks: (Task & {
    controls: { id: string; name: string }[];
    evidenceAutomations?: Array<{
      id: string;
      isEnabled: boolean;
      name: string;
      runs?: Array<{
        status: string;
        success: boolean | null;
        evaluationStatus: string | null;
        createdAt: Date;
        triggeredBy: string;
        runDuration: number | null;
      }>;
    }>;
  })[];
  members: (Member & { user: User })[];
  statusFilter?: string | null;
}

interface CategoryGroup {
  id: string;
  name: string;
  tasks: (Task & {
    controls: { id: string; name: string }[];
    evidenceAutomations?: Array<{
      id: string;
      isEnabled: boolean;
      name: string;
      runs?: Array<{
        status: string;
        success: boolean | null;
        evaluationStatus: string | null;
        createdAt: Date;
        triggeredBy: string;
        runDuration: number | null;
      }>;
    }>;
  })[];
}

const statusPalette = {
  todo: {
    indicator: "bg-border",
    dot: "bg-border",
    label: "text-muted-foreground",
  },
  in_progress: {
    indicator: "bg-blue-400/70",
    dot: "bg-blue-400",
    label: "text-blue-400",
  },
  done: {
    indicator: "bg-primary/70",
    dot: "bg-primary",
    label: "text-primary",
  },
  failed: {
    indicator: "bg-red-500/70",
    dot: "bg-red-500",
    label: "text-red-500",
  },
  not_relevant: {
    indicator: "bg-border",
    dot: "bg-border",
    label: "text-muted-foreground",
  },
} as const;

export function TasksByCategory({
  tasks,
  members,
  statusFilter,
}: TasksByCategoryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Group tasks by their first control, or "Uncategorized"
  const categories = useMemo(() => {
    const grouped: Map<string, CategoryGroup> = new Map();
    const uncategorized: (Task & {
      controls: { id: string; name: string }[];
    })[] = [];

    for (const task of tasks) {
      if (task.controls.length > 0) {
        // Use the first control as the category
        const control = task.controls[0];
        if (!grouped.has(control.id)) {
          grouped.set(control.id, {
            id: control.id,
            name: control.name,
            tasks: [],
          });
        }
        grouped.get(control.id)!.tasks.push(task);
      } else {
        uncategorized.push(task);
      }
    }

    grouped.forEach((category) => {
      category.tasks.sort((a, b) => a.title.localeCompare(b.title));
    });

    // Add uncategorized if there are any
    if (uncategorized.length > 0) {
      uncategorized.sort((a, b) => a.title.localeCompare(b.title));
      grouped.set("uncategorized", {
        id: "uncategorized",
        name: "Uncategorized",
        tasks: uncategorized,
      });
    }

    // Sort categories by name, but keep uncategorized last
    const sortedCategories = Array.from(grouped.values()).sort((a, b) => {
      if (a.id === "uncategorized") return 1;
      if (b.id === "uncategorized") return -1;
      return a.name.localeCompare(b.name);
    });

    return sortedCategories;
  }, [tasks]);

  // Calculate stats for a category
  const getCategoryStats = (categoryTasks: Task[]) => {
    const total = categoryTasks.length;
    const done = categoryTasks.filter(
      (t) => t.status === "done" || t.status === "not_relevant",
    ).length;
    const inProgress = categoryTasks.filter(
      (t) => t.status === "in_progress",
    ).length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, completionRate };
  };

  const assignedMember = (task: Task) => {
    if (!task.assigneeId) return null;
    return members.find((m) => m.id === task.assigneeId);
  };

  const handleTaskClick = (taskId: string) => {
    router.push(`${pathname}/${taskId}`);
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
  };

  // If a category is selected, show only that category's tasks
  const displayCategories = selectedCategory
    ? categories.filter((cat) => cat.id === selectedCategory)
    : categories;

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 text-5xl">📋</div>
        <h3 className="text-lg font-semibold text-slate-900">No tasks found</h3>
        <p className="mt-2 text-sm text-slate-500">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  // Show category grid view
  if (!selectedCategory) {
    return (
      <div className="space-y-6">
        {/* Category Grid */}
        <div>
          <h2 className="text-muted-foreground text-[10px] font-semibold tracking-[0.25em] uppercase">
            Categories
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const stats = getCategoryStats(category.tasks);
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className="group border-border/60 bg-card/50 hover:bg-muted/20 flex flex-col gap-4 rounded-sm border px-4 py-3 text-left transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="border-border/60 bg-muted/40 text-muted-foreground group-hover:text-foreground grid h-8 w-8 place-items-center rounded-[4px] border transition-colors">
                        <Folder className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-sm font-semibold">
                          {category.name}
                        </p>
                        <p className="text-muted-foreground text-[11px] tabular-nums">
                          {stats.total} tasks
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className="text-foreground/90 text-[11px] font-semibold tabular-nums"
                        title="Completion rate"
                      >
                        {stats.completionRate}%
                      </span>
                    </div>
                  </div>

                  {stats.total > 0 && (
                    <div className="bg-muted/40 h-[2px] w-full overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full transition-all duration-500"
                        style={{ width: `${stats.completionRate}%` }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Show selected category's tasks
  return (
    <div className="space-y-6">
      {/* Back button and category header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setSelectedCategory(null)}
          className="border-border/60 text-muted-foreground hover:bg-muted/20 hover:text-foreground inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-[11px] font-medium tracking-[0.18em] uppercase transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>Back to categories</span>
        </button>
      </div>

      {/* Category details */}
      {displayCategories.map((category) => {
        const stats = getCategoryStats(category.tasks);
        return (
          <div key={category.id} className="space-y-4">
            <div className="border-border/60 flex flex-col gap-2 border-b pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-foreground flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-foreground font-semibold">
                    {category.name}
                  </span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {stats.total} tasks
                  </span>
                </div>
                <div className="text-foreground flex items-center gap-2 text-sm font-semibold tabular-nums">
                  {stats.completionRate}%
                  <span className="text-muted-foreground text-[10px] font-medium tracking-[0.25em] uppercase">
                    complete
                  </span>
                </div>
              </div>

              {stats.total > 0 && (
                <div className="bg-muted/40 h-[2px] w-full max-w-sm overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full transition-all duration-500"
                    style={{ width: `${stats.completionRate}%` }}
                  />
                </div>
              )}
            </div>

            {/* Tasks Grid */}
            {category.tasks.length === 0 ? (
              <div className="border-border/60 bg-card/30 rounded-sm border border-dashed px-6 py-10 text-center">
                <Folder className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
                <p className="text-muted-foreground text-sm">
                  No tasks in this category
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {category.tasks.map((task) => {
                  const member = assignedMember(task);
                  const statusStyle =
                    statusPalette[task.status as keyof typeof statusPalette] ??
                    statusPalette.todo;
                  const isNotRelevant = task.status === "not_relevant";
                  return (
                    <div
                      key={task.id}
                      className={`group border-border/60 relative flex cursor-pointer flex-col gap-3 rounded-sm border p-4 transition-colors ${
                        isNotRelevant
                          ? "bg-slate-100/50 opacity-50 backdrop-blur-md hover:bg-slate-100/60"
                          : "bg-card/50 hover:bg-muted/20"
                      }`}
                      onClick={() => handleTaskClick(task.id)}
                    >
                      <span
                        className={`absolute top-0 left-0 h-full w-[2px] ${statusStyle.indicator}`}
                      />
                      {isNotRelevant && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold tracking-[0.15em] text-slate-600 uppercase">
                            NOT RELEVANT
                          </span>
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-start gap-2">
                            <h4
                              className={`line-clamp-2 flex-1 text-sm font-semibold ${
                                isNotRelevant
                                  ? "text-slate-500"
                                  : "text-foreground"
                              }`}
                            >
                              {task.title}
                            </h4>
                            <AutomationIndicator
                              automations={task.evidenceAutomations}
                              variant="inline"
                            />
                          </div>
                          {task.description && (
                            <p
                              className={`line-clamp-2 text-xs leading-relaxed ${
                                isNotRelevant
                                  ? "text-slate-400"
                                  : "text-muted-foreground/80"
                              }`}
                            >
                              {task.description}
                            </p>
                          )}
                        </div>
                        <div
                          className="flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <TaskStatusSelector task={task} />
                        </div>
                      </div>

                      <div className="border-border/60 flex items-center justify-between border-t pt-3">
                        {member ? (
                          <div className="text-muted-foreground flex items-center gap-2 text-xs">
                            <div className="border-border/60 bg-muted/40 text-muted-foreground flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border">
                              {member.user?.image ? (
                                <Image
                                  src={member.user.image}
                                  alt={member.user.name ?? "Assignee"}
                                  width={32}
                                  height={32}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-[11px] font-medium uppercase">
                                  {member.user?.name?.charAt(0) ?? "?"}
                                </span>
                              )}
                            </div>
                            <span className="truncate">
                              {member.user?.name ?? "Unassigned"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Unassigned
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
