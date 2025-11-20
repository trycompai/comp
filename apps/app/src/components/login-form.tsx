"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { GithubSignIn } from "@/components/github-sign-in";
import { GoogleSignIn } from "@/components/google-sign-in";
import { MagicLinkSignIn } from "@/components/magic-link";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@trycompai/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@trycompai/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@trycompai/ui/collapsible";

interface LoginFormProps {
  inviteCode?: string;
  showGoogle: boolean;
  showGithub: boolean;
}

export function LoginForm({
  inviteCode,
  showGoogle,
  showGithub,
}: LoginFormProps) {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [magicLinkState, setMagicLinkState] = useState({
    sent: false,
    email: "",
  });
  const searchParams = useSearchParams();

  const handleMagicLinkSent = (email: string) => {
    setMagicLinkState({ sent: true, email });
  };

  if (magicLinkState.sent) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center space-y-6 px-6 py-16 text-center">
          <CheckCircle2 className="text-primary h-16 w-16" />
          <div className="space-y-2">
            <CardTitle className="text-card-foreground text-2xl font-semibold">
              Magic link sent
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Check your inbox at{" "}
              <span className="text-foreground font-semibold">
                {magicLinkState.email}
              </span>{" "}
              for a magic link to sign in.
            </CardDescription>
          </div>
          <Button
            variant="link"
            onClick={() => setMagicLinkState({ sent: false, email: "" })}
          >
            Use another method
          </Button>
        </CardContent>
      </Card>
    );
  }

  const preferredSignInOption = showGoogle ? (
    <GoogleSignIn
      inviteCode={inviteCode}
      searchParams={searchParams as URLSearchParams}
    />
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
        <Collapsible
          open={isOptionsOpen}
          onOpenChange={setIsOptionsOpen}
          className="w-full"
        >
          <div className="relative flex items-center justify-center py-2">
            <div className="absolute inset-x-0 top-1/2 flex items-center">
              <span className="w-full border-t" />
            </div>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-muted-foreground bg-background hover:bg-muted relative px-4 text-sm"
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

          <CollapsibleContent className="data-[state=open]:animate-in data-[state=open]:slide-in-from-top-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 space-y-4 pt-4">
            {moreOptionsList}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
