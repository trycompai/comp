import { auth as authMiddleware } from "@/auth";
import { createI18nMiddleware } from "next-international/middleware";
import { type NextRequest, NextResponse } from "next/server";

const I18nMiddleware = createI18nMiddleware({
	locales: ["en", "es", "fr", "no", "pt"],
	defaultLocale: "en",
	urlMappingStrategy: "rewrite",
});

export async function middleware(request: NextRequest) {
	const session = await authMiddleware();
	const response = await I18nMiddleware(request);
	const nextUrl = request.nextUrl;

	const pathnameLocale = nextUrl.pathname.split("/", 2)?.[1];

	const pathnameWithoutLocale = pathnameLocale
		? nextUrl.pathname.slice(pathnameLocale.length + 1)
		: nextUrl.pathname;

	const newUrl = new URL(pathnameWithoutLocale || "/", request.url);

	if (!session && newUrl.pathname !== "/auth") {
		const url = new URL("/auth", request.url);

		return NextResponse.redirect(url);
	}

	if (
		session &&
		newUrl.pathname !== "/setup" &&
		session.user.onboarded === false
	) {
		const url = new URL("/setup", request.url);

		return NextResponse.redirect(url);
	}

	response.headers.set("x-pathname", request.nextUrl.pathname);

	return response;
}

export const config = {
	matcher: [
		"/((?!api|_next/static|_next/image|favicon.ico|monitoring|ingest).*)",
	],
};
