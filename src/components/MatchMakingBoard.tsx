'use client';

/* eslint-disable @next/next/no-img-element */

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {useState} from 'react';

import {formatBirthYearLabel} from '@/lib/profiles/age';
import {PARTNER_THUMB_WIDTH, photoThumbnailUrl} from '@/lib/profiles/photo-url';
import type {Profile} from '@/types/profile';

// 매칭 모드용 작은 카드. 사진(정사각, 폭 꽉 채움) 위 + 년생/사는곳 아래로 세로 배치해
// 폭이 좁아도 가로로 넘치지 않게 한다(텍스트는 truncate). 사진 위주로 빽빽하게.
// MiniProfile의 루트를 <article>로 두면 .office-mode article img 셀렉터가 적용된다.
function MiniProfile({profile}: {profile: Profile}) {
  const photo = profile.photos[0];
  return (
    <article className="min-w-0">
      <span className="block aspect-square w-full overflow-hidden rounded-[6px] bg-[var(--violet-100)]">
        {photo ? (
          <img className="h-full w-full object-cover" src={photoThumbnailUrl(photo.url, PARTNER_THUMB_WIDTH)} alt={photo.alt} draggable={false} />
        ) : (
          <span className="grid h-full w-full place-items-center text-[9px] text-slate-400">없음</span>
        )}
      </span>
      <span className="mt-1 block truncate text-center text-[11px] font-bold leading-tight text-[var(--violet-900)]">
        {formatBirthYearLabel(profile.birthYear)}
      </span>
      <span className="block truncate text-center text-[10px] leading-tight text-slate-500">{profile.residence}</span>
    </article>
  );
}

function DraggableDroppableCard({profile}: {profile: Profile}) {
  const drag = useDraggable({id: profile.id, data: {gender: profile.gender}});
  const drop = useDroppable({id: profile.id, data: {gender: profile.gender}});
  const {active} = useDndContext();
  const activeGender = active?.data?.current?.gender as 'female' | 'male' | undefined;
  const isValidTarget = activeGender !== undefined && activeGender !== profile.gender;
  const setRefs = (node: HTMLElement | null) => {
    drag.setNodeRef(node);
    drop.setNodeRef(node);
  };
  return (
    <div
      ref={setRefs}
      {...drag.attributes}
      {...drag.listeners}
      style={{touchAction: 'none', opacity: drag.isDragging ? 0.4 : 1}}
      className={`min-w-0 cursor-grab rounded-[8px] border p-1 transition ${
        drop.isOver && isValidTarget ? 'border-pink-400 bg-pink-50 ring-2 ring-pink-300' : 'border-[var(--border)] bg-white'
      }`}
    >
      <MiniProfile profile={profile} />
    </div>
  );
}

export function MatchMakingBoard({
  females,
  males,
  officeMode = false,
  onPair,
}: {
  females: Profile[];
  males: Profile[];
  officeMode?: boolean;
  onPair: (female: Profile, male: Profile) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {activationConstraint: {distance: 5}}),
    useSensor(TouchSensor, {activationConstraint: {delay: 200, tolerance: 5}}),
  );

  const all = [...females, ...males];
  const activeProfile = all.find(p => p.id === activeId) ?? null;

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const {active, over} = event;
    if (!over || active.id === over.id) return;
    const dragged = all.find(p => p.id === String(active.id));
    const target = all.find(p => p.id === String(over.id));
    if (!dragged || !target || dragged.gender === target.gender) return;
    const female = dragged.gender === 'female' ? dragged : target;
    const male = dragged.gender === 'female' ? target : dragged;
    onPair(female, male);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
      <p className="mb-3 rounded-[8px] bg-pink-50 px-3 py-2 text-center text-sm font-semibold text-pink-700">
        한쪽 매물을 반대편 매물 위로 끌어다 놓으면 매칭/지원을 선택할 수 있어요 💞
      </p>
      <div className={`grid grid-cols-2 divide-x divide-[var(--border)] ${officeMode ? 'office-mode' : ''}`}>
        <div className="min-w-0 pr-2 sm:pr-3">
          <h3 className="mb-2 text-center text-sm font-bold text-[var(--violet-900)]">여성 {females.length}</h3>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {females.map(p => <DraggableDroppableCard key={p.id} profile={p} />)}
          </div>
        </div>
        <div className="min-w-0 pl-2 sm:pl-3">
          <h3 className="mb-2 text-center text-sm font-bold text-[var(--violet-900)]">남성 {males.length}</h3>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {males.map(p => <DraggableDroppableCard key={p.id} profile={p} />)}
          </div>
        </div>
      </div>
      <DragOverlay>
        {activeProfile ? (
          <div className="w-24 rounded-[8px] border border-pink-400 bg-white/95 p-1 opacity-90 shadow-lg">
            <MiniProfile profile={activeProfile} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
