import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return redirect("/auth");
  }

  return <div className="mx-auto max-w-3xl">{children}</div>;
}
