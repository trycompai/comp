import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth");
  }

  if (session.user?.organizationId) {
    redirect(`/${session.user.organizationId}`);
  }

  redirect("/setup");
}