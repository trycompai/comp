import { auth } from '@/app/lib/auth';
import { headers } from 'next/headers';
import { UserMenuClient } from './UserMenuClient';

// Helper function to get initials
function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const names = name.split(' ');
    const firstInitial = names[0]?.charAt(0) ?? '';
    const lastInitial = names.length > 1 ? names[names.length - 1]?.charAt(0) : '';
    const initials = `${firstInitial}${lastInitial}`.toUpperCase();
    // Ensure we return something, even if splitting/chartAt fails unexpectedly
    return initials || '?';
  }
  if (email) {
    // Use first letter of email if name is missing
    return email.charAt(0).toUpperCase();
  }
  // Fallback if both name and email are missing
  return '?';
}

export async function UserMenu() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userInitials = getInitials(session?.user?.name, session?.user?.email);

  return <UserMenuClient user={session?.user ?? null} userInitials={userInitials} />;
}
