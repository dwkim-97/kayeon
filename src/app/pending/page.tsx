import {getSessionUserName} from '@/lib/auth/session';

import {PendingPageClient} from './PendingPageClient';

export default async function PendingPage() {
  const authorName = await getSessionUserName();

  return <PendingPageClient authorName={authorName} />;
}
