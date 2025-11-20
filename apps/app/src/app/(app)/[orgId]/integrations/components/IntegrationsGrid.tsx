"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Plug,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@trycompai/ui/badge";
import { Button } from "@trycompai/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@trycompai/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@trycompai/ui/dialog";
import { Skeleton } from "@trycompai/ui/skeleton";

import type { Integration, IntegrationCategory } from "../data/integrations";
import { getRelevantTasksForIntegration } from "../actions/get-relevant-tasks";
import { CATEGORIES, INTEGRATIONS } from "../data/integrations";
import { SearchInput } from "./SearchInput";

const LOGO_TOKEN = "pk_AZatYxV5QDSfWpRDaBxzRQ";

interface RelevantTask {
  taskTemplateId: string;
  taskName: string;
  reason: string;
  prompt: string;
}

function TaskCard({ task, orgId }: { task: RelevantTask; orgId: string }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  const handleCardClick = async () => {
    setIsNavigating(true);
    toast.loading("Opening task automation...", { id: "navigating" });

    try {
      // Fetch all tasks and find one with matching template ID
      const response = await api.get<
        Array<{ id: string; taskTemplateId: string | null }>
      >("/v1/tasks", orgId);

      if (response.error || !response.data) {
        throw new Error(response.error || "Failed to fetch tasks");
      }

      // Debug logging
      console.log("Looking for taskTemplateId:", task.taskTemplateId);
      console.log(
        "Available tasks:",
        response.data.map((t) => ({
          id: t.id,
          taskTemplateId: t.taskTemplateId,
        })),
      );

      const matchingTask = response.data.find(
        (t) => t.taskTemplateId && t.taskTemplateId === task.taskTemplateId,
      );

      if (!matchingTask) {
        toast.dismiss("navigating");
        toast.error(
          `Task "${task.taskName}" not found. Please create it first.`,
        );
        setIsNavigating(false);
        await router.push(`/${orgId}/tasks`);
        return;
      }

      const url = `/${orgId}/tasks/${matchingTask.id}/automation/new?prompt=${encodeURIComponent(task.prompt)}`;
      toast.dismiss("navigating");
      toast.success("Redirecting...", { duration: 1000 });

      // Use window.location for immediate navigation
      window.location.href = url;
    } catch (error) {
      console.error("Error finding task:", error);
      toast.dismiss("navigating");
      toast.error("Failed to find task");
      setIsNavigating(false);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group/task from-background to-muted/20 border-border/60 hover:border-primary/40 relative block h-full cursor-pointer overflow-hidden rounded-xl border bg-gradient-to-br p-5 transition-all duration-200 hover:shadow-md"
    >
      {isNavigating && (
        <div className="bg-background/80 absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl backdrop-blur-sm">
          <Loader2 className="text-primary h-6 w-6 animate-spin" />
          <div className="space-y-1 text-center">
            <p className="text-foreground text-sm font-medium">
              Opening task...
            </p>
            <p className="text-muted-foreground text-xs">
              Redirecting to automation with prompt pre-filled
            </p>
          </div>
        </div>
      )}
      <div className="from-primary/0 via-primary/0 to-primary/5 absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-200 group-hover/task:opacity-100" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-start gap-2">
              <div className="bg-primary/40 group-hover/task:bg-primary mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full transition-colors" />
              <p className="text-foreground group-hover/task:text-primary text-sm font-semibold transition-colors">
                {task.taskName}
              </p>
            </div>
            <p className="text-muted-foreground line-clamp-2 pl-3.5 text-xs leading-relaxed">
              {task.reason}
            </p>
          </div>
          <ArrowRight className="text-muted-foreground group-hover/task:text-primary mt-0.5 h-4 w-4 flex-shrink-0 transition-all group-hover/task:translate-x-0.5" />
        </div>
      </div>
    </div>
  );
}

export function IntegrationsGrid({
  taskTemplates,
}: {
  taskTemplates: Array<{ id: string; name: string; description: string }>;
}) {
  const { orgId } = useParams<{ orgId: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    IntegrationCategory | "All"
  >("All");
  const [selectedIntegration, setSelectedIntegration] =
    useState<Integration | null>(null);
  const [relevantTasks, setRelevantTasks] = useState<RelevantTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  // Filter integrations with fuzzy search
  const filteredIntegrations = useMemo(() => {
    let filtered = INTEGRATIONS;

    // Filter by category
    if (selectedCategory !== "All") {
      filtered = filtered.filter((i) => i.category === selectedCategory);
    }

    // Fuzzy search - more flexible matching
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const terms = query.split(" ").filter(Boolean);

      filtered = filtered.filter((i) => {
        const searchText =
          `${i.name} ${i.description} ${i.category} ${i.examplePrompts.join(" ")}`.toLowerCase();
        // Match if ANY search term is found
        return terms.some((term) => searchText.includes(term));
      });
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied to clipboard!");
  };

  useEffect(() => {
    if (selectedIntegration && orgId && taskTemplates.length > 0) {
      setIsLoadingTasks(true);
      getRelevantTasksForIntegration(
        selectedIntegration.name,
        selectedIntegration.description,
        taskTemplates,
      )
        .then((tasks) => {
          setRelevantTasks(tasks);
        })
        .catch((error) => {
          console.error("Error fetching relevant tasks:", error);
          setRelevantTasks([]);
        })
        .finally(() => {
          setIsLoadingTasks(false);
        });
    } else {
      setRelevantTasks([]);
    }
  }, [selectedIntegration, orgId, taskTemplates]);

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        {/* Search Bar */}
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search integrations..."
          className="w-full"
        />

        {/* Category Filters - Horizontal scroll on mobile */}
        <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-x-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
          <Button
            size="sm"
            variant={selectedCategory === "All" ? "default" : "outline"}
            onClick={() => setSelectedCategory("All")}
            className="min-w-fit flex-shrink-0 px-4 whitespace-nowrap"
          >
            All
          </Button>
          {CATEGORIES.map((category) => (
            <Button
              key={category}
              size="sm"
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
              className="min-w-fit flex-shrink-0 px-4 whitespace-nowrap"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {/* Integration Cards */}
        {(searchQuery || selectedCategory !== "All") &&
          filteredIntegrations.length > 0 && (
            <div className="text-muted-foreground text-sm">
              Showing {filteredIntegrations.length}{" "}
              {filteredIntegrations.length === 1 ? "match" : "matches"}
            </div>
          )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Results info - only show when filtering */}
          {filteredIntegrations.map((integration) => (
            <Card
              key={integration.id}
              className="group hover:border-primary/30 relative cursor-pointer overflow-hidden transition-all hover:shadow-md"
              onClick={() => setSelectedIntegration(integration)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-background border-border flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border">
                      <Image
                        src={`https://img.logo.dev/${integration.domain}?token=${LOGO_TOKEN}`}
                        alt={`${integration.name} logo`}
                        width={32}
                        height={32}
                        unoptimized
                        className="rounded-md object-contain"
                      />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        {integration.name}
                        {integration.popular && (
                          <Badge
                            variant="secondary"
                            className="px-1.5 py-0 text-[10px]"
                          >
                            Popular
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {integration.category}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="line-clamp-2 text-sm leading-relaxed">
                  {integration.description}
                </CardDescription>
              </CardContent>

              {/* Hover overlay */}
              <div className="bg-primary/5 pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />
            </Card>
          ))}
        </div>
      </div>

      {/* Empty state - opportunity, not limitation */}
      {filteredIntegrations.length === 0 && (
        <div className="py-16 text-center">
          <div className="mx-auto max-w-xl space-y-6">
            <div className="space-y-3">
              <div className="bg-primary/10 inline-flex h-16 w-16 items-center justify-center rounded-2xl">
                <Sparkles className="text-primary h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-foreground text-xl font-semibold">
                  Just ask the agent
                </h3>
                <p className="text-muted-foreground mx-auto max-w-md text-sm leading-relaxed">
                  {searchQuery ? (
                    <>
                      "{searchQuery}" isn't in our directory, but the agent can
                      connect to it anyway. Describe what you need in natural
                      language.
                    </>
                  ) : (
                    <>
                      The agent can integrate with any system—you're not limited
                      to this directory.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="bg-background border-border space-y-3 rounded-xl border p-5 text-left">
              <p className="text-foreground text-sm font-medium">
                Example for your search:
              </p>
              <div className="space-y-2">
                <button
                  onClick={() =>
                    handleCopyPrompt(
                      `Connect to ${searchQuery || "our system"} and check security settings`,
                    )
                  }
                  className="bg-muted/50 border-border hover:border-primary/30 group w-full rounded-lg border p-3 text-left transition-colors"
                >
                  <p className="text-foreground/80 group-hover:text-foreground text-sm">
                    "Connect to {searchQuery || "our system"} and check security
                    settings"
                  </p>
                </button>
                <button
                  onClick={() =>
                    handleCopyPrompt(
                      `Pull compliance data from ${searchQuery || "our internal tool"}`,
                    )
                  }
                  className="bg-muted/50 border-border hover:border-primary/30 group w-full rounded-lg border p-3 text-left transition-colors"
                >
                  <p className="text-foreground/80 group-hover:text-foreground text-sm">
                    "Pull compliance data from{" "}
                    {searchQuery || "our internal tool"}"
                  </p>
                </button>
              </div>
              <Link
                href={`/${orgId}/tasks`}
                className="text-primary hover:text-primary/80 flex items-center justify-center gap-2 pt-2 text-sm font-medium"
              >
                Go to Tasks to get started
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
                className="text-muted-foreground hover:text-foreground text-sm font-medium"
              >
                ← Browse common integrations
              </button>
            )}
          </div>
        </div>
      )}

      {/* Integration Detail Modal */}
      {selectedIntegration && (
        <Dialog
          open={!!selectedIntegration}
          onOpenChange={() => setSelectedIntegration(null)}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-4xl">
            <div className="relative overflow-hidden">
              {/* Header with gradient background */}
              <div className="from-primary/5 via-primary/3 to-background border-border/50 border-b bg-gradient-to-br p-6">
                <DialogHeader className="pb-0">
                  <div className="mb-3 flex items-start gap-4">
                    <div className="bg-background border-border ring-primary/10 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-2 shadow-sm ring-2">
                      <Image
                        src={`https://img.logo.dev/${selectedIntegration.domain}?token=${LOGO_TOKEN}`}
                        alt={`${selectedIntegration.name} logo`}
                        width={36}
                        height={36}
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <DialogTitle className="text-2xl font-bold">
                          {selectedIntegration.name}
                        </DialogTitle>
                        {selectedIntegration.popular && (
                          <Badge
                            variant="secondary"
                            className="px-2 py-0.5 text-[10px]"
                          >
                            Popular
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-primary text-xs font-medium">
                          {selectedIntegration.category}
                        </span>
                        <span className="text-muted-foreground text-xs">•</span>
                        <span className="text-muted-foreground text-xs">
                          Integration
                        </span>
                      </div>
                    </div>
                  </div>
                  <DialogDescription className="text-foreground/80 mt-2 text-sm leading-relaxed">
                    {selectedIntegration.description}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="space-y-8 p-6">
                {/* Setup Instructions */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                      <Plug className="text-primary h-4 w-4" />
                    </div>
                    <h4 className="text-foreground text-base font-semibold">
                      How to Connect
                    </h4>
                  </div>
                  <div className="from-muted/80 to-muted/40 border-border/50 space-y-3 rounded-xl border bg-gradient-to-br p-5 shadow-sm">
                    <p className="text-foreground text-sm leading-relaxed">
                      Click on any relevant task below to create an automation
                      with {selectedIntegration.name}. The automation will be
                      pre-configured with a prompt tailored to that task. The
                      agent will ask you for the necessary permissions and API
                      keys if required.
                    </p>
                    {selectedIntegration.setupHint && (
                      <div className="border-border/50 flex items-start gap-2 border-t pt-2">
                        <CheckCircle2 className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
                        <p className="text-muted-foreground text-xs">
                          <span className="text-foreground font-medium">
                            Typically requires:
                          </span>{" "}
                          {selectedIntegration.setupHint}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Relevant Tasks */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                      <Zap className="text-primary h-4 w-4" />
                    </div>
                    <h4 className="text-foreground text-base font-semibold">
                      Relevant Tasks
                    </h4>
                  </div>
                  {isLoadingTasks ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {[...Array(4)].map((_, index) => (
                        <div
                          key={index}
                          className="from-muted/40 to-muted/20 border-muted-foreground/20 h-full animate-pulse rounded-xl border-2 border-dashed bg-gradient-to-br p-5"
                        >
                          <div className="flex h-full items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="mb-3 flex items-start gap-2">
                                <Skeleton className="bg-muted-foreground/30 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" />
                                <Skeleton className="bg-muted-foreground/30 h-4 w-32" />
                              </div>
                              <div className="space-y-2.5 pl-4">
                                <Skeleton className="bg-muted-foreground/25 h-3 w-full" />
                                <Skeleton className="bg-muted-foreground/25 h-3 w-5/6" />
                                <Skeleton className="bg-muted-foreground/25 h-3 w-4/6" />
                              </div>
                            </div>
                            <Skeleton className="bg-muted-foreground/30 mt-0.5 h-4 w-4 flex-shrink-0 rounded-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : relevantTasks.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {relevantTasks.map((task) => (
                        <TaskCard
                          key={task.taskTemplateId}
                          task={task}
                          orgId={orgId}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-muted/50 border-border/50 rounded-xl border p-5">
                      <p className="text-muted-foreground text-center text-sm">
                        No relevant tasks found for this integration.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
