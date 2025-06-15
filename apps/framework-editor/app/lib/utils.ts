import { headers } from "next/headers";
import { auth } from "./auth";

export function formatEnumValue(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function isAuthorized(): Promise<boolean> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return false;

  const notAuthorized = session?.user.email.split("@")[1] !== "trycomp.ai";

  console.log(`[NotAuthorized] ${notAuthorized}`);

  if (notAuthorized) return false;

  console.log(`[Authorized] ${session?.user.email}`);

  return true;
}
