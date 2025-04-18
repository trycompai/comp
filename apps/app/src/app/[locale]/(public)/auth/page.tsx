import { GithubSignIn } from "@/components/github-sign-in";
import { GoogleSignIn } from "@/components/google-sign-in";
import { MagicLinkSignIn } from "@/components/magic-link";
import { env } from "@/env.mjs";
import { getI18n } from "@/locales/server";
import { auth } from "@/utils/auth";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@comp/ui/accordion";
import { Icons } from "@comp/ui/icons";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import Balancer from "react-wrap-balancer";

export const metadata: Metadata = {
	title: "Login | Comp AI",
};

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<{ inviteCode?: string }>;
}) {
	const t = await getI18n();
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	const { inviteCode } = await searchParams;

	let preferredSignInOption: React.ReactNode;

	if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
		preferredSignInOption = (
			<div className="flex flex-col space-y-2">
				<GoogleSignIn inviteCode={inviteCode} />
			</div>
		);
	} else {
		preferredSignInOption = (
			<div className="flex flex-col space-y-2">
				<MagicLinkSignIn inviteCode={inviteCode} />
			</div>
		);
	}

	let moreSignInOptions: React.ReactNode;

	if (
		env.AUTH_GOOGLE_ID &&
		env.AUTH_GOOGLE_SECRET &&
		env.AUTH_GITHUB_ID &&
		env.AUTH_GITHUB_SECRET
	) {
		moreSignInOptions = (
			<div className="flex flex-col space-y-2">
				<MagicLinkSignIn inviteCode={inviteCode} />
				<GithubSignIn inviteCode={inviteCode} />
			</div>
		);
	} else {
		moreSignInOptions = null;
	}

	const orgId = session?.session?.activeOrganizationId;

	if (orgId && inviteCode) {
		redirect("/setup");
	}

	return (
		<div>
			<header className="w-full fixed left-0 right-0">
				<div className="ml-5 mt-4 md:ml-10 md:mt-10">
					<Link href="/">
						<Icons.Logo />
					</Link>
				</div>
			</header>

			<div className="flex min-h-screen justify-center items-center overflow-hidden p-6 md:p-0">
				<div className="relative z-20 m-auto flex w-full max-w-[380px] flex-col py-8">
					<div className="flex w-full flex-col relative">
						<Balancer>
							<h1 className="font-medium text-3xl pb-1">
								Get Started with Comp AI
							</h1>
							<h2 className="font-medium text-xl pb-1">
								{t("auth.title")}
							</h2>
						</Balancer>

						<div className="pointer-events-auto mt-6 flex flex-col mb-6">
							{preferredSignInOption}

							<Accordion
								type="single"
								collapsible
								className="border-t-[1px] pt-2 mt-6"
							>
								{moreSignInOptions && (
									<AccordionItem
										value="item-1"
										className="border-0"
									>
										<AccordionTrigger className="justify-center space-x-2 flex text-sm">
											<span>More options</span>
										</AccordionTrigger>
										<AccordionContent className="mt-4">
											<div className="flex flex-col space-y-4">
												{moreSignInOptions}
											</div>
										</AccordionContent>
									</AccordionItem>
								)}
							</Accordion>
						</div>

						<p className="text-xs text-muted-foreground">
							By clicking continue, you acknowledge that you have
							read and agree to the{" "}
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
		</div>
	);
}
