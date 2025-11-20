"use client";

import { useState } from "react";
import { authClient } from "@/utils/auth-client";
import { Loader2 } from "lucide-react";

import { Button } from "@trycompai/ui/button";
import { Icons } from "@trycompai/ui/icons";

export function GoogleSignIn({
  inviteCode,
  searchParams,
}: {
  inviteCode?: string;
  searchParams?: URLSearchParams;
}) {
  const [isLoading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);

    // Build the callback URL with search params
    const baseURL = window.location.origin;
    const path = inviteCode ? `/invite/${inviteCode}` : "/";
    const redirectTo = new URL(path, baseURL);

    // Append all search params if they exist
    if (searchParams) {
      searchParams.forEach((value, key) => {
        redirectTo.searchParams.append(key, value);
      });
    }

    await authClient.signIn.social({
      provider: "google",
      callbackURL: redirectTo.toString(),
    });
  };

  return (
    <Button
      onClick={handleSignIn}
      className="h-11 w-full font-medium"
      variant="outline"
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Icons.Google className="h-4 w-4" />
          Continue with Google
        </>
      )}
    </Button>
  );
}
