import { auth } from "@/auth";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { AnimatedLayout } from "@/components/animated-layout";
import { SidebarProvider } from "@/context/sidebar-context";
import { cookies } from "next/headers";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { UserProvider } from "@/store/user/provider";
import { AssistantSheet } from "@/components/sheets/assistant-sheet";

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
  const session = await auth();
  const orgId = (await params).orgId;
  const cookieStore = await cookies();
  const isCollapsed = cookieStore.get("sidebar-collapsed")?.value === "true";

  if (!session) {
    redirect("/auth");
  }

  if (!orgId) {
    redirect("/");
  }

  return (
    <UserProvider data={session.user}>
      <SidebarProvider initialIsCollapsed={isCollapsed}>
        <AnimatedLayout sidebar={<Sidebar />} isCollapsed={isCollapsed}>
          <div className="p-4">
            <Header />
            <main>{children}</main>
          </div>
          <AssistantSheet />
        </AnimatedLayout>
        <HotKeys />
      </SidebarProvider>
    </UserProvider>
  );
}
