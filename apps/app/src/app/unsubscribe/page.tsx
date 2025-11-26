import { getUnsubscribeUrl } from '@/lib/unsubscribe';
import { db } from '@db';
import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: Promise<{ success?: string; email?: string }>;
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { success, email } = params;

  if (success === 'true' && email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <div className="text-center">
            <div className="mb-4 text-4xl">✓</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Successfully Unsubscribed</h1>
            <p className="mb-6 text-gray-600">
              You have been unsubscribed from email notifications and reminders. You will no longer receive these emails
              at <span className="font-semibold">{email}</span>.
            </p>
            <p className="text-sm text-gray-500">
              If you change your mind, you can contact your organization administrator to re-enable notifications.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (email) {
    const user = await db.user.findUnique({
      where: { email },
      select: { emailNotificationsUnsubscribed: true },
    });

    if (user?.emailNotificationsUnsubscribed) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
            <div className="text-center">
              <h1 className="mb-2 text-2xl font-bold text-gray-900">Already Unsubscribed</h1>
              <p className="text-gray-600">
                You are already unsubscribed from email notifications and reminders.
              </p>
            </div>
          </div>
        </div>
      );
    }

    const unsubscribeUrl = getUnsubscribeUrl(email);

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold text-gray-900">Unsubscribe from Email Notifications</h1>
            <p className="mb-6 text-gray-600">
              Are you sure you want to unsubscribe from email notifications and reminders? You will no longer receive
              policy notifications, task reminders, or other automated emails.
            </p>
            <a
              href={unsubscribeUrl}
              className="block w-full rounded-md bg-red-600 px-4 py-2 text-center text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Unsubscribe
            </a>
            <p className="mt-4 text-sm text-gray-500">
              If you change your mind, you can contact your organization administrator to re-enable notifications.
            </p>
          </div>
        </div>
      </div>
    );
  }

  redirect('/');
}

