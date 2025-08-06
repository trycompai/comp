'use client';

import { DubEmbed } from '@dub/embed-react';
import { useTheme } from 'next-themes';
import { T } from 'gt-next';

export const DubReferral = ({ publicToken }: { publicToken: string | null }) => {
  const theme = useTheme();

  if (!publicToken) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <T>
          <p className="text-sm text-muted-foreground">
            No token available. Please try refreshing the page.
          </p>
        </T>
      </div>
    );
  }

  return (
    <DubEmbed
      data="referrals"
      token={publicToken}
      options={{
        theme: (theme.theme ?? 'system') as 'light' | 'dark' | 'system',
        containerStyles: {
          colorScheme: 'auto',
        },
      }}
    />
  );
};
