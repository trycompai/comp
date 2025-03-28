import { GoogleSignIn } from "@/components/google-sign-in";
import { MagicLinkSignIn } from "@/components/magic-link";
import { getI18n } from "@/locales/server";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@bubba/ui/accordion";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
export const metadata: Metadata = {
	title: "Login | Comp AI",
};

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<{ inviteCode?: string }>;
}) {
	const t = await getI18n();
	const session = await auth();

	const { inviteCode } = await searchParams;

	// If user is already logged in and there is no invite code, redirect to home
	if (session?.user && !inviteCode) {
		redirect("/");
	}

	// If user is already logged in and there is an invite code, complete the invitation
	if (session?.user && inviteCode) {
		redirect(`/api/auth/invitation?code=${inviteCode}`);
	}

	const defaultSignInOptions = (
		<div className="flex flex-col space-y-2">
			<GoogleSignIn inviteCode={inviteCode} />
		</div>
	);

	const moreSignInOptions = (
		<div className="flex flex-col space-y-2">
			<MagicLinkSignIn inviteCode={inviteCode} />
		</div>
	);

	return (
		<>
			<div className="flex min-h-[calc(100vh-15rem)] items-center justify-center overflow-hidden p-6 md:p-0">
				<div className="relative z-20 m-auto flex w-full max-w-[380px] flex-col py-8">
					<div className="relative flex w-full flex-col">
						<div className="inline-block from-primary bg-clip-text pb-4">
							<div className="flex flex-row items-center gap-2">
								<Link href="/" className="flex flex-row items-center gap-2">
									<h1 className="font-mono text-xl font-semibold">Comp AI</h1>
								</Link>
							</div>
							<h2 className="mt-4 text-lg font-medium">{t("auth.title")}</h2>
							<div className="mt-2">
								<span className="text-xs text-muted-foreground">
									{t("auth.description")}
								</span>
							</div>
						</div>

						<div className="pointer-events-auto mb-6 flex flex-col">
							{defaultSignInOptions}
							<Accordion
								type="single"
								collapsible
								className="mt-6 border-t-[1px] pt-2"
							>
								<AccordionItem value="item-1" className="border-0">
									<AccordionTrigger className="flex justify-center space-x-2 text-sm">
										<span>{t("auth.options")}</span>
									</AccordionTrigger>
									<AccordionContent className="mt-4">
										<div className="flex flex-col space-y-4">
											{moreSignInOptions}
										</div>
									</AccordionContent>
								</AccordionItem>
							</Accordion>
						</div>

						<p className="text-xs text-muted-foreground">{t("auth.terms")}</p>
					</div>
				</div>
			</div>
		</>
	);
}
