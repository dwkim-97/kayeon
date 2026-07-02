import Image from 'next/image';
import {notFound} from 'next/navigation';

import {PhotoSlider} from './PhotoSlider';
import {getProfileInformationRows} from '@/lib/profiles/information';
import {createSupabaseServerClient, getStoragePublicBase} from '@/lib/supabase/server';
import {rowToProfile} from '@/lib/supabase/mappers';

type PageProps = {params: Promise<{id: string}>};

export default async function ProfileDetailPage({params}: PageProps) {
  const {id} = await params;
  const supabase = await createSupabaseServerClient();

  const {data, error} = await supabase
    .from('profiles')
    .select('*, profile_photos(*)')
    .eq('id', id)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    notFound();
  }

  const {profile_photos: photoRows, ...row} = data;
  const profile = rowToProfile(row, photoRows ?? [], getStoragePublicBase());
  const informationRows = getProfileInformationRows(profile);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-white px-4 py-4">
        <div className="mx-auto max-w-2xl">
          <Image src="/logo.png" alt="카연" width={80} height={28} priority />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <PhotoSlider photos={profile.photos} />

        <ul className="mt-4 space-y-2">
          {informationRows.map(([label, value]) => (
            <li
              key={label}
              className="grid grid-cols-[96px_1fr] overflow-hidden rounded-[8px] border border-[var(--violet-100)] text-sm"
            >
              <span className="border-r border-[var(--violet-100)] bg-[var(--violet-50)] px-3 py-2.5 font-bold text-[var(--violet-900)]">
                {label}
              </span>
              <span className="break-keep px-3 py-2.5 leading-6 text-slate-700">{value}</span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
