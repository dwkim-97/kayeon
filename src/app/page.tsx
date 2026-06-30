import {getSessionUserName} from '@/lib/auth/session';
import {Dashboard} from '@/components/Dashboard';

export default async function Home() {
  const authorName = await getSessionUserName();

  return <Dashboard authorName={authorName} />;
}
