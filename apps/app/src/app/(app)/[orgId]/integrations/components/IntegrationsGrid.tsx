'use client';

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
import { Input } from '@comp/ui/input';
import { ArrowRight, Search, Sparkles, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  CATEGORIES,
  INTEGRATIONS,
  type Integration,
  type IntegrationCategory,
} from '../data/integrations';

const LOGO_TOKEN = 'pk_AZatYxV5QDSfWpRDaBxzRQ';

export function IntegrationsGrid() {
  const { orgId } = useParams<{ orgId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory | 'All'>('All');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

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

  return (
    <div className="space-y-8">
      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

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

      {/* Results info - only show when filtering */}
      {(searchQuery || selectedCategory !== 'All') && filteredIntegrations.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredIntegrations.length}{' '}
          {filteredIntegrations.length === 1 ? 'match' : 'matches'}
        </div>
      )}

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center overflow-hidden">
                  <Image
                    src={`https://img.logo.dev/${selectedIntegration.domain}?token=${LOGO_TOKEN}`}
                    alt={`${selectedIntegration.name} logo`}
                    width={32}
                    height={32}
                    unoptimized
                    className="object-contain"
                  />
                </div>
                <div>
                  <DialogTitle className="text-xl">{selectedIntegration.name}</DialogTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedIntegration.category}
                  </p>
                </div>
              </div>
              <DialogDescription className="text-sm leading-relaxed">
                {selectedIntegration.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-4">
              {/* Setup Instructions */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">How to Connect</h4>
                <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
                  <p className="text-sm text-foreground leading-relaxed">
                    Use the example prompts below, or describe what you need in your own words. The
                    agent will handle authentication and setup.
                  </p>
                  {selectedIntegration.setupHint && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Typically requires:</span>{' '}
                      {selectedIntegration.setupHint}
                    </p>
                  )}
                </div>
              </div>

              {/* Example Prompts */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Example Prompts</h4>
                <div className="space-y-2">
                  {selectedIntegration.examplePrompts.map((prompt, index) => (
                    <button
                      key={index}
                      className="w-full p-3 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors group/prompt text-left"
                      onClick={() => handleCopyPrompt(prompt)}
                    >
                      <p className="text-sm text-foreground/80 group-hover/prompt:text-foreground transition-colors">
                        "{prompt}"
                      </p>
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Click any prompt to copy</span>
                  <Link
                    href={`/${orgId}/tasks`}
                    className="flex items-center gap-1.5 text-primary hover:text-primary/80 font-medium"
                  >
                    Go to Tasks
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
