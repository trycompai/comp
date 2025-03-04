import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import "@bubba/ui/globals.css";
import { Providers } from "@/app/providers";
import { env } from "@/env.mjs";
import { generatePageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { GoogleTagManager } from "@next/third-parties/google";
import localFont from "next/font/local";
import { initializeServer } from "@bubba/analytics";

export const metadata = generatePageMeta({
	url: "/",
});

const font = localFont({
	src: "../../public/fonts/GeneralSans-Variable.ttf",
	display: "swap",
	variable: "--font-general-sans",
});

if (env.NEXT_PUBLIC_POSTHOG_KEY && env.NEXT_PUBLIC_POSTHOG_HOST) {
  initializeServer({
    apiKey: env.NEXT_PUBLIC_POSTHOG_KEY,
    apiHost: env.NEXT_PUBLIC_POSTHOG_HOST,
  });
}

export const preferredRegion = ["auto"];

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<GoogleTagManager gtmId={env.NEXT_PUBLIC_GOOGLE_TAG_ID!} />
			<body
				className={cn(
					"bg-background font-sans antialiased",
					`${GeistMono.variable} ${font.variable}`,
				)}
			>
				<Providers>
					<main>{children}</main>
				</Providers>
				<Toaster richColors />
			</body>
		</html>
	);
}
