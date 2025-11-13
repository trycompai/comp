'use client';

import { api } from '@/lib/api-client';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Skeleton } from '@comp/ui/skeleton';
import { ArrowRight, CheckCircle2, Loader2, Plug, Sparkles, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getRelevantTasksForIntegration } from '../actions/get-relevant-tasks';
import {
  CATEGORIES,
  INTEGRATIONS,
  type Integration,
  type IntegrationCategory,
} from '../data/integrations';
import { SearchInput } from './SearchInput';

const LOGO_TOKEN = 'pk_AZatYxV5QDSfWpRDaBxzRQ';

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
    toast.loading('Opening task automation...', { id: 'navigating' });

    try {
      // Fetch all tasks and find one with matching template ID
      const response = await api.get<Array<{ id: string; taskTemplateId: string | null }>>(
        '/v1/tasks',
        orgId,
      );

      if (response.error || !response.data) {
        throw new Error(response.error || 'Failed to fetch tasks');
      }

      const matchingTask = response.data.find((t) => t.taskTemplateId === task.taskTemplateId);

      if (!matchingTask) {
        toast.dismiss('navigating');
        toast.error(`Task "${task.taskName}" not found. Please create it first.`);
        setIsNavigating(false);
        await router.push(`/${orgId}/tasks`);
        return;
      }

      const url = `/${orgId}/tasks/${matchingTask.id}/automation/new?prompt=${encodeURIComponent(task.prompt)}`;
      toast.dismiss('navigating');
      toast.success('Redirecting...', { duration: 1000 });

      // Use window.location for immediate navigation
      window.location.href = url;
    } catch (error) {
      console.error('Error finding task:', error);
      toast.dismiss('navigating');
      toast.error('Failed to find task');
      setIsNavigating(false);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group/task relative block p-5 rounded-xl bg-gradient-to-br from-background to-muted/20 border border-border/60 hover:border-primary/40 hover:shadow-md transition-all duration-200 h-full overflow-hidden cursor-pointer"
    >
      {isNavigating && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3 rounded-xl">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">Opening task...</p>
            <p className="text-xs text-muted-foreground">
              Redirecting to automation with prompt pre-filled
            </p>
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover/task:opacity-100 transition-opacity duration-200" />
      <div className="relative flex flex-col h-full">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 flex-shrink-0 group-hover/task:bg-primary transition-colors" />
              <p className="text-sm font-semibold text-foreground group-hover/task:text-primary transition-colors">
                {task.taskName}
              </p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 pl-3.5">
              {task.reason}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover/task:text-primary group-hover/task:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory | 'All'>('All');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [relevantTasks, setRelevantTasks] = useState<RelevantTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  // Filter integrations with fuzzy search
  const filteredIntegrations = useMemo(() => {
    let filtered = INTEGRATIONS;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter((i) => i.category === selectedCategory);
    }

    // Fuzzy search - more flexible matching
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const terms = query.split(' ').filter(Boolean);

      filtered = filtered.filter((i) => {
        const searchText =
          `${i.name} ${i.description} ${i.category} ${i.examplePrompts.join(' ')}`.toLowerCase();
        // Match if ANY search term is found
        return terms.some((term) => searchText.includes(term));
      });
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success('Prompt copied to clipboard!');
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
          console.error('Error fetching relevant tasks:', error);
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
      <div className="flex items-center gap-2">
        {/* Search Bar */}
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search integrations..."
          className="w-80 flex-shrink-0"
        />

        {/* Category Filters */}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={selectedCategory === 'All' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('All')}
          >
            All
          </Button>
          {CATEGORIES.map((category) => (
            <Button
              key={category}
              size="sm"
              variant={selectedCategory === category ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {/* Integration Cards */}
        {(searchQuery || selectedCategory !== 'All') && filteredIntegrations.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Showing {filteredIntegrations.length}{' '}
            {filteredIntegrations.length === 1 ? 'match' : 'matches'}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Results info - only show when filtering */}
          {filteredIntegrations.map((integration) => (
            <Card
              key={integration.id}
              className="group relative overflow-hidden hover:shadow-md transition-all hover:border-primary/30 cursor-pointer"
              onClick={() => setSelectedIntegration(integration)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center overflow-hidden">
                      <Image
                        src={`https://img.logo.dev/${integration.domain}?token=${LOGO_TOKEN}`}
                        alt={`${integration.name} logo`}
                        width={32}
                        height={32}
                        unoptimized
                        className="object-contain rounded-md"
                      />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        {integration.name}
                        {integration.popular && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Popular
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{integration.category}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed line-clamp-2">
                  {integration.description}
                </CardDescription>
              </CardContent>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </Card>
          ))}
        </div>
      </div>

      {/* Empty state - opportunity, not limitation */}
      {filteredIntegrations.length === 0 && (
        <div className="text-center py-16">
          <div className="max-w-xl mx-auto space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">Just ask the agent</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                  {searchQuery ? (
                    <>
                      "{searchQuery}" isn't in our directory, but the agent can connect to it
                      anyway. Describe what you need in natural language.
                    </>
                  ) : (
                    <>
                      The agent can integrate with any system—you're not limited to this directory.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-background border border-border text-left space-y-3">
              <p className="text-sm font-medium text-foreground">Example for your search:</p>
              <div className="space-y-2">
                <button
                  onClick={() =>
                    handleCopyPrompt(
                      `Connect to ${searchQuery || 'our system'} and check security settings`,
                    )
                  }
                  className="w-full p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/30 transition-colors text-left group"
                >
                  <p className="text-sm text-foreground/80 group-hover:text-foreground">
                    "Connect to {searchQuery || 'our system'} and check security settings"
                  </p>
                </button>
                <button
                  onClick={() =>
                    handleCopyPrompt(
                      `Pull compliance data from ${searchQuery || 'our internal tool'}`,
                    )
                  }
                  className="w-full p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/30 transition-colors text-left group"
                >
                  <p className="text-sm text-foreground/80 group-hover:text-foreground">
                    "Pull compliance data from {searchQuery || 'our internal tool'}"
                  </p>
                </button>
              </div>
              <Link
                href={`/${orgId}/tasks`}
                className="flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 font-medium pt-2"
              >
                Go to Tasks to get started
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="text-sm text-muted-foreground hover:text-foreground font-medium"
              >
                ← Browse common integrations
              </button>
            )}
          </div>
        </div>
      )}

      {/* Integration Detail Modal */}
      {selectedIntegration && (
        <Dialog open={!!selectedIntegration} onOpenChange={() => setSelectedIntegration(null)}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
            <div className="relative overflow-hidden">
              {/* Header with gradient background */}
              <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-background border-b border-border/50 p-6">
                <DialogHeader className="pb-0">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-14 h-14 rounded-2xl bg-background border-2 border-border shadow-sm flex items-center justify-center overflow-hidden ring-2 ring-primary/10">
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
                      <div className="flex items-center gap-2 mb-1">
                        <DialogTitle className="text-2xl font-bold">
                          {selectedIntegration.name}
                        </DialogTitle>
                        {selectedIntegration.popular && (
                          <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                            Popular
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-primary">
                          {selectedIntegration.category}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">Integration</span>
                      </div>
                    </div>
                  </div>
                  <DialogDescription className="text-sm leading-relaxed text-foreground/80 mt-2">
                    {selectedIntegration.description}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-6 space-y-8">
                {/* Setup Instructions */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Plug className="w-4 h-4 text-primary" />
                    </div>
                    <h4 className="text-base font-semibold text-foreground">How to Connect</h4>
                  </div>
                  <div className="p-5 rounded-xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50 shadow-sm space-y-3">
                    <p className="text-sm text-foreground leading-relaxed">
                      Click on any relevant task below to create an automation with{' '}
                      {selectedIntegration.name}. The automation will be pre-configured with a
                      prompt tailored to that task. The agent will ask you for the necessary
                      permissions and API keys if required.
                    </p>
                    {selectedIntegration.setupHint && (
                      <div className="flex items-start gap-2 pt-2 border-t border-border/50">
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Typically requires:</span>{' '}
                          {selectedIntegration.setupHint}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Relevant Tasks */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-primary" />
                    </div>
                    <h4 className="text-base font-semibold text-foreground">Relevant Tasks</h4>
                  </div>
                  {isLoadingTasks ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[...Array(4)].map((_, index) => (
                        <div
                          key={index}
                          className="p-5 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border-2 border-dashed border-muted-foreground/20 h-full animate-pulse"
                        >
                          <div className="flex items-start justify-between gap-3 h-full">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 mb-3">
                                <Skeleton className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-muted-foreground/30" />
                                <Skeleton className="h-4 w-32 bg-muted-foreground/30" />
                              </div>
                              <div className="pl-4 space-y-2.5">
                                <Skeleton className="h-3 w-full bg-muted-foreground/25" />
                                <Skeleton className="h-3 w-5/6 bg-muted-foreground/25" />
                                <Skeleton className="h-3 w-4/6 bg-muted-foreground/25" />
                              </div>
                            </div>
                            <Skeleton className="w-4 h-4 rounded-full bg-muted-foreground/30 mt-0.5 flex-shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : relevantTasks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {relevantTasks.map((task) => (
                        <TaskCard key={task.taskTemplateId} task={task} orgId={orgId} />
                      ))}
                    </div>
                  ) : (
                    <div className="p-5 rounded-xl bg-muted/50 border border-border/50">
                      <p className="text-sm text-muted-foreground text-center">
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
