"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { Suspense, useEffect, useState } from "react";
import { PostHogPageView } from "./page-view";

interface ProviderProps {
	children: React.ReactNode;
	apiKey: string;
	apiHost: string;
	userId?: string;
}

export function AnalyticsProvider({
	children,
	apiKey,
	apiHost,
	userId,
}: ProviderProps) {
	// Only initialize state if keys are provided
	const shouldInitialize = apiKey && apiHost;
	const [isInitialized, setIsInitialized] = useState(!shouldInitialize); // Start as initialized if keys are missing

	useEffect(() => {
		// Only run effect if keys are provided and not already initialized
		if (typeof window === "undefined" || !shouldInitialize || isInitialized) {
			return;
		}

		try {
			posthog.init(apiKey, {
				api_host: apiHost,
				loaded: (ph) => {
					if (userId) {
						ph.identify(userId);
					}
					setIsInitialized(true);
				},
			});

			return () => {
				posthog.reset();
			};
		} catch (error) {
			setIsInitialized(true); // Still set to true to avoid blocking rendering
		}
	}, [apiKey, apiHost, userId, shouldInitialize, isInitialized]); // Add deps

	// If keys are missing or not initialized yet, just return children
	if (!shouldInitialize || !isInitialized) {
		return <>{children}</>;
	}

	return (
		<Suspense fallback={null}>
			<PHProvider client={posthog}>
				<PostHogPageView />
				{children}
			</PHProvider>
		</Suspense>
	);
}
