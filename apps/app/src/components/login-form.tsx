'use client';

import { GithubSignIn } from '@/components/github-sign-in';
import { GoogleSignIn } from '@/components/google-sign-in';
import { MagicLinkSignIn } from '@/components/magic-link';
import { MicrosoftSignIn } from '@/components/microsoft-sign-in';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@comp/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@comp/ui/collapsible';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

interface LoginFormProps {
  inviteCode?: string;
  showGoogle: boolean;
  showGithub: boolean;
  showMicrosoft: boolean;
}

export function LoginForm({ inviteCode, showGoogle, showGithub, showMicrosoft }: LoginFormProps) {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [magicLinkState, setMagicLinkState] = useState({ sent: false, email: '' });
  const searchParams = useSearchParams();

  const handleMagicLinkSent = (email: string) => {
    setMagicLinkState({ sent: true, email });
  };

  if (magicLinkState.sent) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center text-center space-y-6 py-16 px-6">
          <CheckCircle2 className="h-16 w-16 text-primary" />
          <div className="space-y-2">
            <CardTitle className="text-2xl font-semibold text-card-foreground">
              Magic link sent
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Check your inbox at{' '}
              <span className="font-semibold text-foreground">{magicLinkState.email}</span> for a
              magic link to sign in.
            </CardDescription>
          </div>
          <Button variant="link" onClick={() => setMagicLinkState({ sent: false, email: '' })}>
            Use another method
          </Button>
        </CardContent>
      </Card>
    );
  }

  const preferredSignInOption = showGoogle ? (
    <GoogleSignIn inviteCode={inviteCode} searchParams={searchParams as URLSearchParams} />
  ) : (
    <MagicLinkSignIn
      key="preferred-magic"
      inviteCode={inviteCode}
      searchParams={searchParams as URLSearchParams}
      onMagicLinkSubmit={handleMagicLinkSent}
    />
  );

  const moreOptionsList = [];
  if (showGoogle) {
    moreOptionsList.push(
      <MagicLinkSignIn
        key="secondary-magic"
        inviteCode={inviteCode}
        searchParams={searchParams as URLSearchParams}
        onMagicLinkSubmit={handleMagicLinkSent}
      />,
    );
  }
  if (showMicrosoft) {
    moreOptionsList.push(
      <MicrosoftSignIn
        key="microsoft"
        inviteCode={inviteCode}
        searchParams={searchParams as URLSearchParams}
      />,
    );
  }
  if (showGithub) {
    moreOptionsList.push(
      <GithubSignIn
        key="github"
        inviteCode={inviteCode}
        searchParams={searchParams as URLSearchParams}
      />,
    );
  }

  return (
    <div className="space-y-4">
      {preferredSignInOption}

      {moreOptionsList.length > 0 && (
        <Collapsible open={isOptionsOpen} onOpenChange={setIsOptionsOpen} className="w-full">
          <div className="relative flex items-center justify-center py-2">
            <div className="absolute inset-x-0 top-1/2 flex items-center">
              <span className="w-full border-t" />
            </div>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="relative px-4 text-sm text-muted-foreground bg-background hover:bg-muted"
              >
                More options
                {isOptionsOpen ? (
                  <ChevronUp className="ml-1 h-4 w-4 transition-transform duration-200" />
                ) : (
                  <ChevronDown className="ml-1 h-4 w-4 transition-transform duration-200" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="space-y-4 pt-4 data-[state=open]:animate-in data-[state=open]:slide-in-from-top-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
            {moreOptionsList}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
