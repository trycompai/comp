import { useState } from "react";

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
} from "@trycompai/ui";
import { Card, CardDescription, CardHeader } from "@trycompai/ui/card";
import { Skeleton } from "@trycompai/ui/skeleton";

import {
  AUTOMATION_EXAMPLES,
  AutomationExample,
} from "../../constants/automation-examples";

interface EmptyStateProps {
  onExampleClick: (prompt: string) => void;
  status: string;
  onSubmit: () => void;
  suggestions?: {
    title: string;
    prompt: string;
    vendorName?: string;
    vendorWebsite?: string;
  }[];
  isLoadingSuggestions?: boolean;
}

function getVendorLogoUrl(vendorName?: string, vendorWebsite?: string): string {
  // Prefer vendorWebsite if provided
  if (vendorWebsite) {
    // Clean up the website - remove protocol, www, and paths
    const cleanDomain = vendorWebsite
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .split("?")[0];
    return `https://img.logo.dev/${cleanDomain}?token=pk_AZatYxV5QDSfWpRDaBxzRQ`;
  }

  if (!vendorName) {
    return "https://img.logo.dev/trycomp.ai?token=pk_AZatYxV5QDSfWpRDaBxzRQ";
  }

  // Try to extract domain from vendor name or use a default
  // Common vendor mappings
  const vendorDomainMap: Record<string, string> = {
    github: "github.com",
    vercel: "vercel.com",
    cloudflare: "cloudflare.com",
    aws: "aws.amazon.com",
    gcp: "cloud.google.com",
    azure: "azure.microsoft.com",
  };

  const lowerName = vendorName.toLowerCase();
  for (const [key, domain] of Object.entries(vendorDomainMap)) {
    if (lowerName.includes(key)) {
      return `https://img.logo.dev/${domain}?token=pk_AZatYxV5QDSfWpRDaBxzRQ`;
    }
  }

  // Try to extract domain from vendor name if it looks like a URL
  const urlMatch = vendorName.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/i);
  if (urlMatch) {
    return `https://img.logo.dev/${urlMatch[1]}?token=pk_AZatYxV5QDSfWpRDaBxzRQ`;
  }

  return "https://img.logo.dev/trycomp.ai?token=pk_AZatYxV5QDSfWpRDaBxzRQ";
}

function VendorCard({
  example,
  onExampleClick,
}: {
  example: AutomationExample;
  onExampleClick: (prompt: string) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const fallbackUrl =
    "https://img.logo.dev/trycomp.ai?token=pk_AZatYxV5QDSfWpRDaBxzRQ";
  const imageUrl = imageError ? fallbackUrl : example.url;

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
      onClick={() => onExampleClick(example.prompt)}
    >
      <CardHeader className="p-4">
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <img
              src={imageUrl}
              alt={example.title}
              width={24}
              height={24}
              className="rounded-sm"
              onError={() => {
                if (!imageError) {
                  setImageError(true);
                }
              }}
            />
          </div>
          <CardDescription className="flex-1">
            <p className="text-foreground text-sm leading-relaxed font-normal">
              {example.title}
            </p>
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

function SuggestionCardSkeleton() {
  return (
    <Card className="transition-all duration-200">
      <CardHeader className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-6 w-6 flex-shrink-0 rounded-sm" />
          <div className="flex-1">
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

export function EmptyState({
  onExampleClick,
  status,
  onSubmit,
  suggestions,
  isLoadingSuggestions = false,
}: EmptyStateProps) {
  const { textInput } = usePromptInputController();

  // Use dynamic suggestions if provided, otherwise fall back to static examples
  const examplesToShow: AutomationExample[] = suggestions
    ? suggestions.map((s) => ({
        title: s.title,
        prompt: s.prompt,
        url: getVendorLogoUrl(s.vendorName, s.vendorWebsite),
      }))
    : AUTOMATION_EXAMPLES;

  // Show skeleton loaders when loading suggestions for new automations
  const showSkeletons = isLoadingSuggestions && suggestions?.length === 0;

  return (
    <div className="z-20 h-full min-h-0 flex-1 overflow-y-auto">
      <div className="flex h-full w-full flex-col items-center px-4 py-48">
        <div className="mb-16 w-full max-w-3xl space-y-8 text-center">
          <p className="text-primary z-20 text-2xl font-medium tracking-wide">
            What evidence do you want to collect?
          </p>
          <PromptInput
            onSubmit={async ({ text }) => {
              onSubmit();
            }}
            className="w-full max-w-3xl"
          >
            <PromptInputBody>
              <PromptInputTextarea
                placeholder="Describe what evidence you want to collect..."
                disabled={status === "streaming" || status === "submitted"}
                className="max-h-[400px] min-h-[80px]"
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools />
              <PromptInputSubmit
                status={
                  status === "streaming" || status === "submitted"
                    ? "submitted"
                    : undefined
                }
                disabled={
                  !textInput.value.trim() ||
                  status === "streaming" ||
                  status === "submitted"
                }
              />
            </PromptInputFooter>
          </PromptInput>
        </div>

        <div className="mt-16 w-full max-w-4xl space-y-4">
          <h3 className="text-center text-lg font-normal">
            Get started with examples
          </h3>

          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-3">
            {showSkeletons
              ? // Show 6 skeleton cards while loading
                Array.from({ length: 6 }).map((_, index) => (
                  <SuggestionCardSkeleton key={`skeleton-${index}`} />
                ))
              : // Show actual suggestion cards
                examplesToShow.map(
                  (example: AutomationExample, index: number) => (
                    <VendorCard
                      key={`${example.title}-${index}`}
                      example={example}
                      onExampleClick={onExampleClick}
                    />
                  ),
                )}
          </div>
        </div>
      </div>
    </div>
  );
}
