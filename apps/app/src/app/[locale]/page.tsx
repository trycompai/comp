import { auth } from "@/utils/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const ROUTES = {
  AUTH: "/auth",
  SETUP: "/setup",
  FRAMEWORKS: (orgId: string) => `/${orgId}/frameworks`,
} as const;

export default async function Page() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.session) {
      return redirect(ROUTES.AUTH);
    }

    const { activeOrganizationId } = session.session;

    if (activeOrganizationId) {
      return redirect(ROUTES.FRAMEWORKS(activeOrganizationId));
    }

    return redirect(ROUTES.SETUP);
  } catch (error) {
    return redirect(ROUTES.AUTH);
  }
}
