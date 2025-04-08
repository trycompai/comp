import { AnimatedLayout } from "@/components/animated-layout";
import { Header } from "@/components/header";
import { AssistantSheet } from "@/components/sheets/assistant-sheet";
import { Sidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/context/sidebar-context";
import { auth } from "@/utils/auth";
import dynamic from "next/dynamic";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

const HotKeys = dynamic(
	() => import("@/components/hot-keys").then((mod) => mod.HotKeys),
	{
		ssr: true,
	},
);

export default async function Layout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const cookieStore = await cookies();
	const isCollapsed = cookieStore.get("sidebar-collapsed")?.value === "true";

	if (!session) {
		return redirect("/auth");
	}

	if (!session.session.activeOrganizationId) {
		return redirect("/");
	}

	return (
		<SidebarProvider initialIsCollapsed={isCollapsed}>
			<AnimatedLayout sidebar={<Sidebar />} isCollapsed={isCollapsed}>
				<div className="mx-4 md:ml-[95px] md:mr-10 pb-8">
					<Header />
					<main>{children}</main>
				</div>
				<AssistantSheet />
			</AnimatedLayout>
			<HotKeys />
		</SidebarProvider>
	);
}
