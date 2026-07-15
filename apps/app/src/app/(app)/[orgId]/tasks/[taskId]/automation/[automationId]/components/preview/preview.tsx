'use client';

import { cn } from '@/lib/utils';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { CompassIcon, RefreshCwIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BarLoader } from 'react-spinners';
import { Panel, PanelHeader } from '../../components/panels/panels';

interface Props {
  className?: string;
  disabled?: boolean;
  url?: string;
}

/**
 * Only allow http(s) URLs to reach an iframe `src` or anchor `href`. User-typed
 * input flows into the preview iframe, so an unvalidated value like
 * `javascript:...` or `data:text/html,...` would execute in the preview context
 * (XSS). Returns the normalized href, or undefined if the value isn't http(s).
 */
function toSafeUrl(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.href
      : undefined;
  } catch {
    return undefined;
  }
}

export function Preview({ className, disabled, url }: Props) {
  const [currentUrl, setCurrentUrl] = useState(url);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState(url || '');
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadStartTime = useRef<number | null>(null);

  // Sanitized view of currentUrl used for every DOM sink (iframe src, anchor href).
  const safeUrl = toSafeUrl(currentUrl);

  useEffect(() => {
    setCurrentUrl(url);
    setInputValue(url || '');
  }, [url]);

  const refreshIframe = () => {
    if (iframeRef.current && safeUrl) {
      setIsLoading(true);
      setError(null);
      loadStartTime.current = Date.now();
      iframeRef.current.src = '';
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = safeUrl;
        }
      }, 10);
    }
  };

  const loadNewUrl = () => {
    if (!inputValue) return;
    const safeInput = toSafeUrl(inputValue);
    if (!safeInput) {
      setError('Enter a valid http(s) URL');
      return;
    }
    if (safeInput === safeUrl) {
      refreshIframe();
      return;
    }
    // Drive the iframe through state (not iframeRef.current.src) so the src
    // prop, the external-link href, and refresh/try-again all stay in sync
    // with the URL actually shown.
    setIsLoading(true);
    setError(null);
    loadStartTime.current = Date.now();
    setCurrentUrl(safeInput);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError('Failed to load the page');
  };

  return (
    <Panel className={className}>
      <PanelHeader>
        <div className="absolute flex items-center space-x-1">
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer px-1"
          >
            <CompassIcon className="w-4" />
          </a>
          <button
            onClick={refreshIframe}
            type="button"
            className={cn('cursor-pointer px-1', {
              'animate-spin': isLoading,
            })}
          >
            <RefreshCwIcon className="w-4" />
          </button>
        </div>

        <div className="m-auto h-6">
          {url && (
            <input
              type="text"
              className="font-mono text-xs h-6 border border-gray-200 px-4 bg-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[300px]"
              onChange={(event) => setInputValue(event.target.value)}
              onClick={(event) => event.currentTarget.select()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur();
                  loadNewUrl();
                }
              }}
              value={inputValue}
            />
          )}
        </div>
      </PanelHeader>

      <div className="flex h-[calc(100%-2rem-1px)] relative">
        {safeUrl && !disabled && (
          <>
            <ScrollArea className="w-full">
              <iframe
                ref={iframeRef}
                src={safeUrl}
                className="w-full h-full"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title="Browser content"
              />
            </ScrollArea>

            {isLoading && !error && (
              <div className="absolute inset-0 bg-background/90 flex items-center justify-center flex-col gap-2">
                <BarLoader color="hsl(var(--muted-foreground))" />
                <span className="text-muted-foreground text-xs">Loading...</span>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 bg-background flex items-center justify-center flex-col gap-2">
                <span className="text-destructive">Failed to load page</span>
                <button
                  className="text-primary hover:underline text-sm"
                  type="button"
                  onClick={() => {
                    if (safeUrl) {
                      setIsLoading(true);
                      setError(null);
                      const newUrl = new URL(safeUrl);
                      newUrl.searchParams.set('t', Date.now().toString());
                      setCurrentUrl(newUrl.toString());
                    }
                  }}
                >
                  Try again
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}
