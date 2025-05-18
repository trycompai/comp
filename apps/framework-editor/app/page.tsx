import { redirect } from "next/navigation";
import { isAuthorized } from "@/app/lib/utils";

export default async function Page() {
	const isAllowed = await isAuthorized();

	if (!isAllowed) {
		redirect("/auth");
	}

	return redirect("/frameworks");
}
