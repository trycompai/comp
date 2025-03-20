import { auth as authMiddleware } from "@/auth";
import { createI18nMiddleware } from "next-international/middleware";
import { type NextRequest, NextResponse } from "next/server";

const I18nMiddleware = createI18nMiddleware({
	locales: ["en", "es", "fr", "no", "pt"],
	defaultLocale: "en",
	urlMappingStrategy: "rewrite",
});

export const config = {
	matcher: [
		"/((?!api|_next/static|_next/image|favicon.ico|monitoring|ingest).*)",
	],
	runtime: "nodejs",
};

export async function middleware(request: NextRequest) {
	const session = await authMiddleware();
	const nextUrl = request.nextUrl;

	if (!session?.user && nextUrl.pathname !== "/auth") {
		return NextResponse.redirect(new URL("/auth", nextUrl.origin));
	}

	if (session?.user.id && nextUrl.pathname === "/auth") {
		return NextResponse.redirect(new URL("/", nextUrl.origin));
	}

	if (nextUrl.pathname === "/") {
		if (!session?.user) {
			return NextResponse.redirect(new URL("/auth", nextUrl.origin));
		}

		// If authenticated, let the page handle the redirection
		// This way we avoid Prisma in middleware
		return NextResponse.next();
	}

	const response = I18nMiddleware(request);

	response.headers.set("x-pathname", nextUrl.pathname);

	return response;
}
