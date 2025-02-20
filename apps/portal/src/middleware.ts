import type { auth } from "@/app/lib/auth";
import { betterFetch } from "@better-fetch/fetch";
import { createI18nMiddleware } from "next-international/middleware";
import { type NextRequest, NextResponse } from "next/server";

const I18nMiddleware = createI18nMiddleware({
  locales: ["en", "es", "fr", "no", "pt"],
  defaultLocale: "en",
  urlMappingStrategy: "rewrite",
});

type Session = typeof auth.$Infer.Session;

export async function middleware(request: NextRequest) {
  const response = I18nMiddleware(request);
  const nextUrl = request.nextUrl;

  const { data: session } = await betterFetch<Session>("/api/auth/get-session", {
    baseURL: request.nextUrl.origin,
    headers: {
      cookie: request.headers.get("cookie") || "",
    },
  });

  const pathnameLocale = nextUrl.pathname.split("/", 2)?.[1];

  const pathnameWithoutLocale = pathnameLocale
    ? nextUrl.pathname.slice(pathnameLocale.length + 1)
    : nextUrl.pathname;

  const newUrl = new URL(pathnameWithoutLocale || "/", request.url);

  if (!session && newUrl.pathname !== "/auth") {
    const url = new URL("/auth", request.url);

    return NextResponse.redirect(url);
  }

  if (session?.user?.organizationId && newUrl.pathname === "/unauthorized") {
    const url = new URL("/", request.url);

    return NextResponse.redirect(url);
  }

  if (session && !session.user.organizationId && newUrl.pathname !== "/unauthorized") {
    const url = new URL("/unauthorized", request.url);

    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|monitoring|ingest).*)",
  ],
};
