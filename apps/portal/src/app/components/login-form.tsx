'use client';

import { Separator } from '@trycompai/ui-shadcn';
import { useSearchParams } from 'next/navigation';
import { GoogleSignIn } from './google-sign-in';
import { MicrosoftSignIn } from './microsoft-sign-in';

interface LoginFormProps {
  inviteCode?: string;
  showGoogle: boolean;
  showMicrosoft: boolean;
}

export function LoginForm({ inviteCode, showGoogle, showMicrosoft }: LoginFormProps) {
  const searchParams = useSearchParams();

  if (!showGoogle && !showMicrosoft) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs font-medium text-muted-foreground">OR</span>
        <Separator className="flex-1" />
      </div>

      <div className="flex flex-col gap-4">
        {showGoogle ? (
          <GoogleSignIn inviteCode={inviteCode} searchParams={searchParams as URLSearchParams} />
        ) : null}
        {showMicrosoft ? (
          <MicrosoftSignIn inviteCode={inviteCode} searchParams={searchParams as URLSearchParams} />
        ) : null}
      </div>
    </div>
  );
}
