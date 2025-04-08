"use client";

import { env } from "@/env.mjs";
import { I18nProviderClient } from "@/locales/client";
import { authClient } from "@/utils/auth-client";
import { AnalyticsProvider } from "@comp/analytics";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

type ProviderProps = {
	children: ReactNode;
	locale: string;
};

export function Providers({ children, locale }: ProviderProps) {
	const { data: session } = authClient.useSession();

	const hasAnalyticsKeys =
		env.NEXT_PUBLIC_POSTHOG_KEY && env.NEXT_PUBLIC_POSTHOG_HOST;

	return (
		<I18nProviderClient locale={locale}>
			<ThemeProvider
				attribute="class"
				defaultTheme="dark"
				forcedTheme="dark"
				disableTransitionOnChange
				scriptProps={{ "data-cfasync": "false" }}
			>
				<AnalyticsProvider
					apiKey={env.NEXT_PUBLIC_POSTHOG_KEY ?? ""}
					apiHost={env.NEXT_PUBLIC_POSTHOG_HOST ?? ""}
					userId={session?.user?.id}
				>
					{children}
				</AnalyticsProvider>
			</ThemeProvider>
		</I18nProviderClient>
	);
}
