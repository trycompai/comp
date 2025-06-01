import { headers } from "next/headers";
import { auth } from "./auth";

export function formatEnumValue(value: string | null | undefined): string {
	if (!value) return "";
	return value
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

export async function isAuthorized(): Promise<boolean> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) return false;

	const allowedDomains = ["trycomp.ai", "aubo.ai"];
	const userDomain = session?.user.email.split("@")[1];
	const isAuthorized = allowedDomains.includes(userDomain);

	console.log(`[NotAuthorized] ${!isAuthorized}`);

	if (!isAuthorized) return false;

	console.log(`[Authorized] ${session?.user.email}`);

	return true;
}
