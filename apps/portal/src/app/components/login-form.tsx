"use client";

import { useSearchParams } from "next/navigation";

import { GoogleSignIn } from "./google-sign-in";

interface LoginFormProps {
  inviteCode?: string;
  showGoogle: boolean;
}

export function LoginForm({ inviteCode, showGoogle }: LoginFormProps) {
  const searchParams = useSearchParams();

  if (!showGoogle) {
    return;
  }

  return (
    <div className="mt-4">
      <div className="relative flex items-center justify-center py-2">
        <div className="absolute inset-x-0 top-1/2 flex items-center">
          <span className="w-full border-t" />
        </div>
        <span className="bg-background text-muted-foreground relative z-10 px-3 text-xs font-medium">
          OR
        </span>
      </div>
      <div className="space-y-4 pt-4">
        <GoogleSignIn
          inviteCode={inviteCode}
          searchParams={searchParams as URLSearchParams}
        />
      </div>
    </div>
  );
}
