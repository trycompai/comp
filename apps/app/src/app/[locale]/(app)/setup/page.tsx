import { Onboarding } from "@/components/forms/create-organization-form";
import { db } from "@bubba/db";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Organization Setup | Comp AI",
};

export default async function Page() {
	const frameworks = await getFrameworks();

	return <Onboarding frameworks={frameworks} />;
}

const getFrameworks = async () => {
	return await db.framework.findMany({
		orderBy: {
			name: "asc",
		},
	});
};
