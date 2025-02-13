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
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth");
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
