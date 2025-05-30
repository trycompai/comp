import { AnimatedLayout } from "@/components/animated-layout";
import { Header } from "@/components/header";
import { AssistantSheet } from "@/components/sheets/assistant-sheet";
import { Sidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/context/sidebar-context";
import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import type { Organization } from "@comp/db/types";
import dynamic from "next/dynamic";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { FloatingOnboardingChecklist } from "@/components/onboarding/FloatingOnboardingChecklist";
import { getOnboardingStatus } from "./implementation/actions";

const HotKeys = dynamic(
	() => import("@/components/hot-keys").then((mod) => mod.HotKeys),
	{
		ssr: true,
	},
);

export default async function Layout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ orgId: string }>;
}) {
	const { orgId: requestedOrgId } = await params;
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	const activeOrgId = session?.session?.activeOrganizationId;

	const cookieStore = await cookies();
	const isCollapsed = cookieStore.get("sidebar-collapsed")?.value === "true";
	const floatingOpen =
		cookieStore.get("floating-onboarding-checklist")?.value !== "false";

	if (!session?.session?.userId) {
		return redirect("/auth");
	}

	if (!activeOrgId) {
		return redirect("/");
	}

	let currentOrganization: Organization | null = null;

	if (requestedOrgId === activeOrgId) {
		currentOrganization = await db.organization.findUnique({
			where: {
				id: activeOrgId,
			},
		});
	} else {
		currentOrganization = await db.organization.findUnique({
			where: {
				id: requestedOrgId,
				members: { some: { userId: session.session.userId } },
			},
		});
	}

	if (!currentOrganization) {
		return notFound();
	}

	const onboardingStatus = await getOnboardingStatus(currentOrganization.id);

	if ("error" in onboardingStatus) {
		console.error(
			"Error fetching onboarding status:",
			onboardingStatus.error,
		);
	}

	return (
		<SidebarProvider initialIsCollapsed={isCollapsed}>
			<AnimatedLayout
				sidebar={<Sidebar organization={currentOrganization} />}
				isCollapsed={isCollapsed}
			>
				<Header />
				<main className="px-4 mx-auto pb-8 min-h-[calc(100vh-15vh)]">
					{children}
				</main>
				<AssistantSheet />
			</AnimatedLayout>
			<div className="hidden md:flex">
				{!("error" in onboardingStatus) &&
					onboardingStatus.completedItems <
						onboardingStatus.totalItems && (
						<FloatingOnboardingChecklist
							orgId={currentOrganization.id}
							completedItems={onboardingStatus.completedItems}
							totalItems={onboardingStatus.totalItems}
							checklistItems={onboardingStatus.checklistItems}
							floatingOpen={floatingOpen}
						/>
					)}
			</div>
			<HotKeys />
		</SidebarProvider>
	);
}
