import { redirect } from 'next/navigation';

export default function AdminPage() {
  // Redirect to integrations by default
  redirect('/admin/integrations');
}

