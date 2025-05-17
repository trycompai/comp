import { UserMenu } from "@/components/user-menu";
import { getOnboardingForCurrentOrganization } from "@/data/getOnboarding";
import { getI18n } from "@/locales/server";
import { auth } from "@/utils/auth";
import { buttonVariants } from "@comp/ui/button";
import { Icons } from "@comp/ui/icons";
import { Skeleton } from "@comp/ui/skeleton";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AssistantButton } from "./ai/chat-button";
import { MobileMenu } from "./mobile-menu";
import { NotificationCenter } from "./notification-center";
import { getOrganizations } from "@/data/getOrganizations";
import { db } from "@comp/db";
import type { FrameworkEditorFramework } from "@comp/db/types";

export async function Header() {
	const t = await getI18n();

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const currentOrganizationId = session?.session.activeOrganizationId;

	if (!currentOrganizationId) {
		redirect("/");
	}

	const { completedAll } = await getOnboardingForCurrentOrganization();
	const { organizations } = await getOrganizations();

	const frameworks = await db.frameworkEditorFramework.findMany({
		select: {
			id: true,
			name: true,
			description: true,
			version: true,
		},
	});

	return (
		<header className="flex justify-between items-center bg-backgroundSoft py-4 top-0 z-10 px-4 border-b border-border/40 static">
			<MobileMenu
				organizationId={currentOrganizationId}
				completedOnboarding={completedAll}
				organizations={organizations}
				frameworks={frameworks}
			/>

			<AssistantButton />

			<div className="flex space-x-2 ml-auto">
				<div className="hidden md:flex gap-2">
					<Link
						className={buttonVariants({
							variant: "outline",
							size: "sm",
						})}
						href="https://roadmap.trycomp.ai"
						target="_blank"
					>
						Feedback
					</Link>
					<Link
						className={buttonVariants({
							variant: "outline",
							size: "sm",
						})}
						href="https://discord.gg/compai"
						target="_blank"
					>
						<Icons.Discord className="h-4 w-4" />
						{t("header.discord.button")}
					</Link>
				</div>

				<NotificationCenter />

				<Suspense
					fallback={<Skeleton className="h-8 w-8 rounded-full" />}
				>
					<UserMenu />
				</Suspense>
			</div>
		</header>
	);
}
