import {getSessionUserName} from '@/lib/auth/session';

import {HistoryPageClient} from './HistoryPageClient';

export default async function HistoryPage() {
  const authorName = await getSessionUserName();

  return <HistoryPageClient authorName={authorName} />;
}
