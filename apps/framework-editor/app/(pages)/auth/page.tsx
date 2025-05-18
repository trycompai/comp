import { auth } from "@/app/lib/auth";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Balancer from "react-wrap-balancer";
import { GoogleSignIn } from "./google-sign-in";
import { Unauthorized } from "./Unauthorized";

export const metadata: Metadata = {
	title: "Login | Comp AI",
};

export default async function Page() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const hasSession = session?.user;
	const isAllowed = session?.user.email.split("@")[1] === "trycomp.ai";

	if (hasSession && !isAllowed) {
		return <Unauthorized />;
	}

	if (hasSession && isAllowed) {
		redirect("/frameworks");
	}

	let preferredSignInOption: React.ReactNode;

	if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
		preferredSignInOption = (
			<div className="flex flex-col space-y-2">
				<GoogleSignIn />
			</div>
		);
	}

	return (
		<div className="flex min-h-screen justify-center items-center overflow-hidden p-6 md:p-0">
			<div className="relative z-20 m-auto flex w-full max-w-[380px] flex-col py-8">
				<div className="flex w-full flex-col relative">
					<Balancer>
						<h1 className="font-medium text-3xl pb-1">
							Get Started with Comp AI
						</h1>
						<h2 className="font-medium text-xl pb-1">
							Sign in to continue
						</h2>
					</Balancer>

					<div className="pointer-events-auto mt-6 flex flex-col mb-6">
						{preferredSignInOption}
					</div>

					<p className="text-xs text-muted-foreground">
						By clicking continue, you acknowledge that you have read
						and agree to the{" "}
						<a
							href="https://trycomp.ai/terms-and-conditions"
							className="underline"
						>
							Terms and Conditions
						</a>{" "}
						and{" "}
						<a
							href="https://trycomp.ai/privacy-policy"
							className="underline"
						>
							Privacy Policy
						</a>
						.
					</p>
				</div>
			</div>
		</div>
	);
}
