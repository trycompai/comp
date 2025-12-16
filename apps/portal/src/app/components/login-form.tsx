'use client';

import { GoogleSignIn } from './google-sign-in';
import { MicrosoftSignIn } from './microsoft-sign-in';
import { useSearchParams } from 'next/navigation';

interface LoginFormProps {
  inviteCode?: string;
  showGoogle: boolean;
  showMicrosoft: boolean;
}

export function LoginForm({ inviteCode, showGoogle, showMicrosoft }: LoginFormProps) {
  const searchParams = useSearchParams();

  if (!showGoogle && !showMicrosoft) {
    return;
  }

  return (
    <div className="mt-4">
      <div className="relative flex items-center justify-center py-2">
        <div className="absolute inset-x-0 top-1/2 flex items-center">
          <span className="w-full border-t" />
        </div>
        <span className="relative z-10 bg-background px-3 text-xs text-muted-foreground font-medium">
          OR
        </span>
      </div>
      <div className="space-y-4 pt-4">
        {showGoogle && <GoogleSignIn inviteCode={inviteCode} searchParams={searchParams as URLSearchParams} />}
        {showMicrosoft && <MicrosoftSignIn inviteCode={inviteCode} searchParams={searchParams as URLSearchParams} />}
      </div>
    </div>
  );
}