import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import Dashboard from '@/components/Dashboard';

export default async function Page() {
  const session = await getSession();

  if (!session.user?.isLoggedIn) {
    redirect('/login');
  }

  return <Dashboard />;
}
