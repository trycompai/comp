import {
  Card,
  CardContent,
  Skeleton,
  Text,
} from '@trycompai/design-system';
import { useState } from 'react';
import { AUTOMATION_EXAMPLES, AutomationExample } from '../../constants/automation-examples';

interface EmptyStateProps {
  onExampleClick: (prompt: string) => void;
  suggestions?: { title: string; prompt: string; vendorName?: string; vendorWebsite?: string }[];
  isLoadingSuggestions?: boolean;
}

function getVendorLogoUrl(vendorName?: string, vendorWebsite?: string): string {
  // Prefer vendorWebsite if provided
  if (vendorWebsite) {
    // Clean up the website - remove protocol, www, and paths
    const cleanDomain = vendorWebsite
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .split('?')[0];
    return `https://img.logo.dev/${cleanDomain}?token=pk_AZatYxV5QDSfWpRDaBxzRQ`;
  }

  if (!vendorName) {
    return 'https://img.logo.dev/trycomp.ai?token=pk_AZatYxV5QDSfWpRDaBxzRQ';
  }

  // Try to extract domain from vendor name or use a default
  // Common vendor mappings
  const vendorDomainMap: Record<string, string> = {
    github: 'github.com',
    vercel: 'vercel.com',
    cloudflare: 'cloudflare.com',
    aws: 'aws.amazon.com',
    gcp: 'cloud.google.com',
    azure: 'azure.microsoft.com',
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

  return 'https://img.logo.dev/trycomp.ai?token=pk_AZatYxV5QDSfWpRDaBxzRQ';
}

function VendorCard({
  example,
  onExampleClick,
}: {
  example: AutomationExample;
  onExampleClick: (prompt: string) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const fallbackUrl = 'https://img.logo.dev/trycomp.ai?token=pk_AZatYxV5QDSfWpRDaBxzRQ';
  const imageUrl = imageError ? fallbackUrl : example.url;

  return (
    <div
      role="button"
      tabIndex={0}
      className="cursor-pointer transition-all duration-200 hover:scale-[1.02]"
      onClick={() => onExampleClick(example.prompt)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onExampleClick(example.prompt);
        }
      }}
    >
      <Card size="sm">
        <CardContent>
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
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
            <Text as="div" size="sm" leading="relaxed">
              {example.title}
            </Text>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SuggestionCardSkeleton() {
  return (
    <Card size="sm">
      <CardContent>
        <div className="flex items-start gap-3">
          <Skeleton style={{ height: 24, width: 24, borderRadius: 2 }} />
          <div className="flex-1">
            <Skeleton style={{ height: 16, width: '100%' }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  onExampleClick,
  suggestions,
  isLoadingSuggestions = false,
}: EmptyStateProps) {
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
    <div className="w-full max-w-4xl space-y-4">
      <Text as="div" size="lg" weight="medium">
        Get started with examples
      </Text>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {showSkeletons
          ? // Show 6 skeleton cards while loading
            Array.from({ length: 6 }).map((_, index) => (
              <SuggestionCardSkeleton key={`skeleton-${index}`} />
            ))
          : // Show actual suggestion cards
            examplesToShow.map((example: AutomationExample, index: number) => (
              <VendorCard
                key={`${example.title}-${index}`}
                example={example}
                onExampleClick={onExampleClick}
              />
            ))}
      </div>
    </div>
  );
}
