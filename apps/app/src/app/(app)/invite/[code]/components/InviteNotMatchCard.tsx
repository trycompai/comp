"use client";

import { SignOut } from "@/components/sign-out";

import { InviteStatusCard } from "./InviteStatusCard";

export function InviteNotMatchCard({
  currentEmail,
  invitedEmail,
}: {
  currentEmail: string;
  invitedEmail: string;
}) {
  return (
    <InviteStatusCard
      title="Wrong account"
      description="You're signed in with a different email than the one this invite was sent to. Please sign out and sign back in with the invited email."
    >
      <div className="text-muted-foreground mx-auto flex max-w-[42ch] flex-col gap-4 leading-relaxed">
        <div className="space-y-2 text-sm">
          <p>
            You are signed in as
            <span className="border-muted bg-muted/40 mx-1 inline-flex items-center rounded-xs border px-2 py-0.5 text-sm">
              {currentEmail}
            </span>
          </p>
          <p>
            This invite is for
            <span className="border-muted bg-muted/40 mx-1 inline-flex items-center rounded-xs border px-2 py-0.5 text-sm">
              {invitedEmail}
            </span>
          </p>
        </div>
      </div>
      <SignOut asButton className="w-full" />
    </InviteStatusCard>
  );
}
