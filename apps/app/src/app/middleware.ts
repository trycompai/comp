import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const config = {
  runtime: "nodejs",
  matcher: [
    // Skip auth-related routes
    "/((?!api|_next/static|_next/image|favicon.ico|monitoring|ingest|onboarding|research).*)",
  ],
};

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const response = NextResponse.next();
  const nextUrl = request.nextUrl;

  // Add x-path-name
  response.headers.set("x-pathname", nextUrl.pathname);

  // 1. Not authenticated
  if (!session && nextUrl.pathname !== "/auth") {
    const url = new URL("/auth", request.url);

    return NextResponse.redirect(url);
  }

  // 2. Authenticated; redirect to onboarding if not completed
  if (session) {
    // 2.1. If the user has an active organization, redirect to implementation
    if (
      session.session.activeOrganizationId &&
      nextUrl.pathname !== "/auth" &&
      !nextUrl.pathname.startsWith("/setup/onboarding")
    ) {
      const onboarding = await db.onboarding.findFirst({
        where: {
          organizationId: session.session.activeOrganizationId as string,
        },
      });

      if (onboarding && !onboarding.completed && !onboarding.triggerJobId) {
        return NextResponse.redirect(new URL("/setup/onboarding", request.url));
      }
    }
  }

  return response;
}
