import { auth } from "@/utils/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function RootPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session || !session.session) {
		return redirect("/auth");
	}

	if (session.session.activeOrganizationId) {
		return redirect(`/${session.session.activeOrganizationId}/home`);
	}

	return redirect("/setup");
}
