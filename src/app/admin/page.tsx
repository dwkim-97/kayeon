import {getSessionUserName} from '@/lib/auth/session';

import {AdminPageClient} from './AdminPageClient';

export default async function AdminPage() {
  const authorName = await getSessionUserName();

  return <AdminPageClient authorName={authorName} />;
}
