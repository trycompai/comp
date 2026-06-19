'use client';

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@trycompai/design-system';

export interface BrowserConnectionProfile {
  id: string;
  hostname: string;
  loginIdentity: string;
  displayName: string;
  status: 'unverified' | 'verified' | 'needs_reauth' | 'blocked';
  lastVerifiedAt?: string | null;
  blockedReason?: string | null;
  vaultProvider?: string | null;
}

const statusLabel: Record<BrowserConnectionProfile['status'], string> = {
  unverified: 'Unverified',
  verified: 'Verified',
  needs_reauth: 'Needs reauth',
  blocked: 'Blocked',
};

const statusVariant = (status: BrowserConnectionProfile['status']) => {
  if (status === 'verified') return 'default';
  if (status === 'blocked' || status === 'needs_reauth') return 'destructive';
  return 'secondary';
};

export function BrowserConnectionProfileList({
  profiles,
}: {
  profiles: BrowserConnectionProfile[];
}) {
  if (profiles.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auth Profiles</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y rounded-md border">
          {profiles.map((profile) => (
            <div key={profile.id} className="flex items-center justify-between gap-4 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{profile.displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {profile.hostname}
                  {profile.loginIdentity ? ` · ${profile.loginIdentity}` : ''}
                </p>
                {profile.blockedReason && (
                  <p className="mt-1 text-xs text-destructive">{profile.blockedReason}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {profile.vaultProvider && (
                  <Badge variant="outline">{profile.vaultProvider}</Badge>
                )}
                <Badge variant={statusVariant(profile.status)}>
                  {statusLabel[profile.status]}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
