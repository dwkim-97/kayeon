import Image from 'next/image';
import {notFound} from 'next/navigation';

import {PhotoSlider} from './PhotoSlider';
import {getProfileInformationRows} from '@/lib/profiles/information';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {getStoragePublicBase} from '@/lib/supabase/server';
import {rowToProfile} from '@/lib/supabase/mappers';

type PageProps = {params: Promise<{id: string}>};

export default async function ProfileDetailPage({params}: PageProps) {
  const {id} = await params;
  const supabase = createSupabaseAdminClient();

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
  // 공유 페이지는 이상형·주선자 코멘트를 숨긴다.
  const informationRows = getProfileInformationRows(profile, {hidePrivateNotes: true});

  return (
    <div className="flex h-screen flex-col bg-black md:flex-row">
      {/* 헤더 — 사진 위에 absolute (모바일) / 좌측 상단 absolute (PC) */}
      <header className="absolute left-0 right-0 top-0 z-30 px-5 py-4 md:right-auto md:w-[55%]">
        <Image src="/logo.png" alt="카연" width={72} height={26} priority />
      </header>

      {/* 좌측(PC) / 상단(모바일): 사진 슬라이더 */}
      <div className="relative flex-1 md:h-screen md:w-[55%] md:flex-none">
        <div className="relative h-screen md:h-full">
          <PhotoSlider photos={profile.photos} infoRows={informationRows} />
        </div>
      </div>

      {/* 우측(PC): 정보 패널 / 모바일: 숨김 (오버레이로 대체) */}
      <div className="hidden md:flex md:h-screen md:w-[45%] md:flex-col md:overflow-y-auto md:bg-white">
        <div className="flex flex-1 flex-col px-8 pb-10 pt-24">
          <ul className="space-y-2">
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
        </div>
      </div>

    </div>
  );
}
