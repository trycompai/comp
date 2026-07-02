import { SignOut } from '@/components/sign-out';

/**
 * Shown to a signed-in user who has no active organization membership but was
 * previously a member (all memberships deactivated/removed) — i.e. they were
 * offboarded. Without this, such a user was silently dropped into onboarding,
 * which spawned a spurious empty org and locked them into a loop (CS-569).
 *
 * The most common cause is a domain change: the old account keeps signing in
 * after being offboarded. The primary action is therefore "sign out" so they
 * can sign back in with their current account.
 */
export default function AccessRemovedPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6 rounded-lg border p-8 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {'Your access was removed'}
          </h1>
          <p className="text-muted-foreground">
            {
              'This account is no longer a member of any organization. If your company recently changed email domains or offboarded this account, sign out and sign back in with your current account. Otherwise, contact your administrator to be re-invited.'
            }
          </p>
        </div>

        <div className="flex justify-center">
          <SignOut asButton />
        </div>
      </div>
    </div>
  );
}
