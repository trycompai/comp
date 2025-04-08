"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import { PostHogPageView } from "./page-view";

interface ProviderProps {
	children: React.ReactNode;
	userId?: string;
}

export function AnalyticsProvider({ children, userId }: ProviderProps) {
	useEffect(() => {
		if (
			!process.env.NEXT_PUBLIC_POSTHOG_KEY ||
			!process.env.NEXT_PUBLIC_POSTHOG_HOST
		) {
			return;
		}

		posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
			api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
			capture_pageview: true,
			loaded: (ph) => {
				if (userId) {
					ph.identify(userId);
				}
			},
		});
	}, []);

	return (
		<PHProvider client={posthog}>
			<PostHogPageView />
			{children}
		</PHProvider>
	);
}
