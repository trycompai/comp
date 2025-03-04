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
	const [isInitialized, setIsInitialized] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") return;

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
	}, [apiKey, apiHost, userId]);

	if (!isInitialized) {
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
