import { auth } from "@/utils/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function RootPage() {
	console.log("before getSession");

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	console.log("before auth");

	if (!session || !session.session) {
		console.log("redirecting to auth");
		return redirect("/auth");
	}

	console.log("before frameworks");

	if (session.session.activeOrganizationId) {
		console.log("redirecting to frameworks");
		return redirect(`/${session.session.activeOrganizationId}/frameworks`);
	}

	console.log("redirecting to setup");

	return redirect("/setup");
}
