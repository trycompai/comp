import { GithubSignIn } from "@/components/github-sign-in";
import { GoogleSignIn } from "@/components/google-sign-in";
import { getI18n } from "@/locales/server";
import { Icons } from "@comp/ui/icons";

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Login | Comp AI",
};

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<{ inviteCode?: string }>;
}) {
	const t = await getI18n();

	const { inviteCode } = await searchParams;

	const defaultSignInOptions = (
		<div className="flex flex-col space-y-2">
			<GoogleSignIn inviteCode={inviteCode} />
			<GithubSignIn inviteCode={inviteCode} />
		</div>
	);

	return (
		<>
			<div className="flex min-h-[calc(100vh-15rem)] items-center justify-center overflow-hidden p-6 md:p-0">
				<div className="relative z-20 m-auto flex w-full max-w-[380px] flex-col p-2">
					<div className="relative flex w-full flex-col">
						<div className="inline-block from-primary bg-clip-text pb-4">
							<div className="flex flex-row items-center gap-2">
								<Link href="/" className="flex flex-row items-center gap-2">
									<Icons.Logo className="h-8 w-8" />
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
						</div>

						<p className="text-xs text-muted-foreground">{t("auth.terms")}</p>
					</div>
				</div>
			</div>
		</>
	);
}
