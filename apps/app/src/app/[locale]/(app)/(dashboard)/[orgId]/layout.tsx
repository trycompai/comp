import { auth } from "@/auth";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";

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

  if (!session) {
    redirect("/auth");
  }

  if (!orgId) {
    redirect("/");
  }

  return (
    <div className="relative">
      <Sidebar />

      <div className="mx-4 md:ml-[95px] md:mr-10 pb-8">
        <Header />
        <main>{children}</main>
      </div>

      <HotKeys />
    </div>
  );
}
