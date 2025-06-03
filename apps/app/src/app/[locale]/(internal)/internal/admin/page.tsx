import { auth } from "@/utils/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OrganizationDashboard } from "./organization-dashboard";
import PageWithBreadcrumb from "@/components/pages/PageWithBreadcrumb";

export default async function Page() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/");
	}

	if (!session.user.email?.endsWith("@trycomp.ai") && !session.user.email?.endsWith("@aubo.ai")) {
		redirect("/");
	}

	// We have a validated admin user session here
	const { email, id } = session.user;

	if (!email || !id) {
		// Handle case where email or id might be unexpectedly missing
		console.error("Admin user session missing email or ID.");
		redirect("/");
	}

	return (
		<div className="p-4">
			<PageWithBreadcrumb
				breadcrumbs={[{ label: "Admin", current: true }]}
			>
				{/* Pass required fields instead of the full object */}
				<OrganizationDashboard
					loggedInUserId={id}
					loggedInUserEmail={email}
				/>
			</PageWithBreadcrumb>
		</div>
	);
}
