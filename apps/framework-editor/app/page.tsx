import { isAuthorized } from '@/app/lib/utils';
import { redirect } from 'next/navigation';

export default async function Page() {
  const isAllowed = await isAuthorized();

  if (!isAllowed) {
    redirect('/auth');
  }

  return redirect('/frameworks');
}
