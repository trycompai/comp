"use client";

import { useEffect, useState } from "react";
import { healAndSetAccessToken } from "@/actions/trigger/heal-access-token";
import { TriggerProvider } from "@/components/trigger-provider";

interface TriggerTokenProviderProps {
  triggerJobId?: string;
  initialToken?: string;
  children: React.ReactNode;
}

export function TriggerTokenProvider({
  triggerJobId,
  initialToken,
  children,
}: TriggerTokenProviderProps) {
  const [token, setToken] = useState<string | null>(initialToken || null);
  const [isLoading, setIsLoading] = useState(!initialToken && !!triggerJobId);

  useEffect(() => {
    async function ensureToken() {
      if (triggerJobId && !initialToken) {
        try {
          // This runs as a proper server action and can set cookies
          const healedToken = await healAndSetAccessToken(triggerJobId);
          setToken(healedToken);
        } catch (error) {
          console.error("Failed to heal token:", error);
        } finally {
          setIsLoading(false);
        }
      }
    }

    ensureToken();
  }, [triggerJobId, initialToken]);

  // If we need a token but don't have one yet, show loading
  if (triggerJobId && isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="border-primary h-4 w-4 animate-spin rounded-full border-b-2"></div>
        <span className="text-muted-foreground ml-2 text-sm">
          Connecting...
        </span>
      </div>
    );
  }

  // If we need a token but failed to get one, show error
  if (triggerJobId && !token && !isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <span className="text-destructive text-sm">
          Failed to establish connection
        </span>
      </div>
    );
  }

  // If no trigger job needed, just render children
  if (!triggerJobId) {
    return <>{children}</>;
  }

  // Wrap everything in TriggerProvider with the token
  return (
    <TriggerProvider accessToken={token || ""}>{children}</TriggerProvider>
  );
}
