import { AnimatedLayout } from "@/components/animated-layout";
import { Sidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/context/sidebar-context";
import { getCurrentOrganization } from "@/lib/currentOrganization";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId: requestedOrgId } = await params;

  const currentOrganization = await getCurrentOrganization({
    requestedOrgId,
  });

  return (
    <SidebarProvider>
      <AnimatedLayout
        sidebar={
          <Sidebar organization={currentOrganization} collapsed={true} />
        }
        isCollapsed={true}
        blurred={true}
      >
        <main className="mx-auto max-h-[calc(100vh-100px)] px-4 pb-8">
          {children}
        </main>
      </AnimatedLayout>
    </SidebarProvider>
  );
}
