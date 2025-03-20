import { createI18nMiddleware } from "next-international/middleware";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const config = {
	matcher: [
		"/((?!api|_next/static|_next/image|favicon.ico|monitoring|ingest).*)",
	],
	runtime: "nodejs",
};

const I18nMiddleware = createI18nMiddleware({
	locales: ["en", "es", "fr", "no", "pt"],
	defaultLocale: "en",
	urlMappingStrategy: "rewrite",
});

export default auth((req) => {
	try {
		const { auth: session, nextUrl } = req;

		if (!session?.user && nextUrl.pathname !== "/auth") {
			return NextResponse.redirect(new URL("/auth", nextUrl.origin));
		}

		if (session?.user.id && nextUrl.pathname === "/auth") {
			return NextResponse.redirect(new URL("/", nextUrl.origin));
		}

		// Only handle root path redirects
		if (nextUrl.pathname === "/") {
			if (!session?.user) {
				return NextResponse.redirect(new URL("/auth", nextUrl.origin));
			}

			// If authenticated, let the page handle the redirection
			// This way we avoid Prisma in middleware
			return NextResponse.next();
		}

		const response = I18nMiddleware(req);

		response.headers.set("x-pathname", nextUrl.pathname);

		return response;
	} catch (error) {
		console.error("Middleware error:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
});
