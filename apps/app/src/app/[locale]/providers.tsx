"use client";

import { I18nProviderClient } from "@/locales/client";
import { AnalyticsProvider } from "@comp/analytics";
import { Session, User } from "better-auth";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

type ProviderProps = {
	children: ReactNode;
	locale: string;
	session: {
		session: Session | null;
		user: User | null;
	} | null;
};

export function Providers({ children, locale, session }: ProviderProps) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="dark"
			forcedTheme="dark"
			disableTransitionOnChange
			scriptProps={{ "data-cfasync": "false" }}
		>
			<AnalyticsProvider userId={session?.user?.id ?? undefined}>
				<I18nProviderClient locale={locale}>{children}</I18nProviderClient>
			</AnalyticsProvider>
		</ThemeProvider>
	);
}
