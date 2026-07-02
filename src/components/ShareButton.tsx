'use client';

import {Share2, X} from 'lucide-react';
import Script from 'next/script';
import {useState} from 'react';

import {formatBirthYearLabel} from '@/lib/profiles/age';
import {religionLabels} from '@/lib/profiles/options';
import type {Profile} from '@/types/profile';

// ---------- Kakao SDK types ----------

type KakaoShareApi = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share: {
    sendCustom: (input: {templateId: number; templateArgs: Record<string, string>}) => void;
  };
};

declare global {
  interface Window {
    Kakao: KakaoShareApi;
  }
}

// ---------- helpers ----------

const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY || '';
const FEED_TEMPLATE_ID = 134945;
const LIST_TEMPLATE_ID = 134947;
const LIST_SIZE = 5;
const EMPTY_IMAGE_URL = 'https://kayeon.vercel.app/empty-profile.svg';

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

function buildDescription(profile: Profile): string {
  const parts: string[] = [profile.residence, `${profile.height}cm`, profile.job];
  if (profile.religion !== 'not_selected') parts.push(religionLabels[profile.religion]);
  if (profile.mbti) parts.push(profile.mbti);
  if (profile.hobbies) parts.push(profile.hobbies);
  return parts.filter(Boolean).join(' · ');
}

function buildTemplateArgs(profile: Profile, origin: string): Record<string, string> {
  const args: Record<string, string> = {
    title: formatBirthYearLabel(profile.birthYear),
    description: buildDescription(profile),
    profileUrl: `profiles/${profile.id}`,
  };
  const firstPhoto = profile.photos[0];
  if (firstPhoto) args.imageUrl = firstPhoto.url;
  return args;
}

function initKakao() {
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(kakaoKey);
  }
}

export function getShareProfileLabel(profile: Profile) {
  return formatBirthYearLabel(profile.birthYear);
}

// ---------- component ----------

type ShareButtonProps = {
  profiles: Profile[];
};

export function ShareButton({profiles}: ShareButtonProps) {
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  const hasKakao = !!kakaoKey;
  const groups = chunk(profiles, LIST_SIZE);
  const isSingleBatch = groups.length <= 1;

  const shareGroup = (group: Profile[]) => {
    initKakao();
    const origin = window.location.origin;

    if (group.length === 1) {
      // 1명: 피드형 커스텀 템플릿
      window.Kakao.Share.sendCustom({
        templateId: FEED_TEMPLATE_ID,
        templateArgs: buildTemplateArgs(group[0], origin),
      });
    } else {
      // 2명 이상: 리스트형 커스텀 템플릿 (최대 5명 고정 슬롯)
      const args: Record<string, string> = {
        headerTitle: `소개 풀 (${group.length}명)`,
      };

      for (let i = 0; i < LIST_SIZE; i++) {
        const profile = group[i];
        if (profile) {
          args[`title${i + 1}`] = formatBirthYearLabel(profile.birthYear);
          args[`desc${i + 1}`] = buildDescription(profile);
          args[`img${i + 1}`] = profile.photos[0]?.url ?? EMPTY_IMAGE_URL;
          args[`url${i + 1}`] = `profiles/${profile.id}`;
        } else {
          args[`title${i + 1}`] = '-';
          args[`desc${i + 1}`] = '-';
          args[`img${i + 1}`] = EMPTY_IMAGE_URL;
          args[`url${i + 1}`] = '';
        }
      }

      window.Kakao.Share.sendCustom({
        templateId: LIST_TEMPLATE_ID,
        templateArgs: args,
      });
    }
  };

  const handleClick = () => {
    if (profiles.length === 0) return;

    // SDK 로드 여부를 런타임에 확인 (빌드타임 env 여부와 무관)
    if (!window.Kakao?.Share) {
      alert('카카오 공유 기능을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    if (isSingleBatch) {
      shareGroup(profiles);
    } else {
      setIsBatchModalOpen(true);
    }
  };

  return (
    <>
      <Script
        src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.5/kakao.min.js"
        strategy="afterInteractive"
      />

      <button
        className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-[var(--violet-600)] px-4 font-bold text-white shadow-[0_12px_30px_rgba(127,34,254,0.24)] transition hover:bg-[var(--violet-700)] disabled:bg-[var(--violet-200)]"
        type="button"
        disabled={profiles.length === 0}
        onClick={handleClick}
      >
        <Share2 size={17} aria-hidden />
        {`카카오톡 공유 (${profiles.length})`}
      </button>

      {isBatchModalOpen ? (
        <BatchShareModal
          groups={groups}
          onShareGroup={shareGroup}
          onClose={() => setIsBatchModalOpen(false)}
        />
      ) : null}
    </>
  );
}

// ---------- batch share modal ----------

function BatchShareModal({
  groups,
  onShareGroup,
  onClose,
}: {
  groups: Profile[][];
  onShareGroup: (group: Profile[]) => void;
  onClose: () => void;
}) {
  const [sentIndexes, setSentIndexes] = useState<Set<number>>(new Set());

  const handleShare = (group: Profile[], index: number) => {
    onShareGroup(group);
    setSentIndexes(prev => new Set([...prev, index]));
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--violet-950)]/45 px-4 py-6">
      <section className="w-full max-w-md rounded-[8px] bg-white shadow-[0_28px_90px_rgba(47,13,104,0.26)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-extrabold text-[var(--violet-950)]">카카오톡 공유</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {groups.length}개 그룹으로 나눠 전송합니다. 그룹별로 공유해 주세요.
            </p>
          </div>
          <button
            className="grid h-9 w-9 place-items-center rounded-[8px] text-slate-500 hover:bg-[var(--violet-50)]"
            type="button"
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="max-h-[60vh] divide-y divide-[var(--border)] overflow-y-auto">
          {groups.map((group, i) => (
            <div className="flex items-center gap-3 px-5 py-4" key={i}>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-[var(--violet-600)]">
                  그룹 {i + 1}/{groups.length}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {group.map(getShareProfileLabel).join(', ')}
                </p>
              </div>
              <button
                className={`shrink-0 rounded-[8px] px-4 py-2 text-sm font-bold transition ${
                  sentIndexes.has(i)
                    ? 'border border-[var(--violet-200)] bg-[var(--violet-50)] text-[var(--violet-600)]'
                    : 'bg-[var(--violet-600)] text-white hover:bg-[var(--violet-700)]'
                }`}
                type="button"
                onClick={() => handleShare(group, i)}
              >
                {sentIndexes.has(i) ? '다시 공유' : '공유하기'}
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--border)] px-5 py-4 text-right">
          <button
            className="h-10 rounded-[8px] bg-[var(--violet-950)] px-5 text-sm font-bold text-white hover:bg-[var(--violet-900)]"
            type="button"
            onClick={onClose}
          >
            완료
          </button>
        </div>
      </section>
    </div>
  );
}

// ---------- canvas fallback (no Kakao key) ----------

// Kept for environments where the Kakao key is absent
export function getShareImageLayout(profileCount: number) {
  const base = {width: 1080, cardHeight: 760, gap: 34, padding: 56};
  return {
    ...base,
    height: base.padding * 2 + profileCount * base.cardHeight + Math.max(0, profileCount - 1) * base.gap,
  };
}

export function getShareProfileCardLayout(cardWidth: number) {
  const layout = {imageHeight: 640, imageInset: 28, imageWidth: 500, informationGap: 28, informationRightPadding: 28};
  return {
    ...layout,
    informationWidth: cardWidth - layout.imageInset - layout.imageWidth - layout.informationGap - layout.informationRightPadding,
  };
}

export function wrapTextByWidth(text: string, maxWidth: number, measureText: (v: string) => number): string[] {
  const normalized = text.trim();
  if (!normalized) return [''];
  const lines: string[] = [];
  let current = '';
  for (const ch of normalized) {
    if (ch === ' ' && current.length === 0) continue;
    const next = `${current}${ch}`;
    if (current && measureText(next) > maxWidth) { lines.push(current.trimEnd()); current = ch.trimStart(); continue; }
    current = next;
  }
  if (current) lines.push(current.trimEnd());
  return lines;
}

async function renderAndDownload(profiles: Profile[]) {
  const {width, cardHeight, gap, padding, height} = getShareImageLayout(profiles.length);
  const dpr = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#F5F3FF';
  ctx.fillRect(0, 0, width, height);
  for (const [i, profile] of profiles.entries()) {
    const y = padding + i * (cardHeight + gap);
    await drawCard(ctx, profile, padding, y, width - padding * 2, cardHeight);
  }
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'kayeon-share.png'; a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

async function drawCard(ctx: CanvasRenderingContext2D, profile: Profile, x: number, y: number, w: number, h: number) {
  roundRect(ctx, x, y, w, h, 28, '#FFFFFF');
  const {imageHeight, imageInset, imageWidth, informationGap, informationWidth} = getShareProfileCardLayout(w);
  const ix = x + imageInset, iy = y + imageInset;
  const photos = profile.photos.slice(0, 4);
  for (const [i, photo] of photos.entries()) {
    const cw = photos.length === 1 ? imageWidth : (imageWidth - 8) / 2;
    const ch = photos.length === 1 ? imageHeight : (imageHeight - 8) / 2;
    const cx = ix + (photos.length === 1 ? 0 : (i % 2) * (cw + 8));
    const cy = iy + (photos.length === 1 ? 0 : Math.floor(i / 2) * (ch + 8));
    await drawImg(ctx, photo.url, cx, cy, cw, ch);
  }
  const rows: Array<[string, string]> = [
    ['나이', formatBirthYearLabel(profile.birthYear)],
    ['키', `${profile.height}cm`],
    ['사는 곳', profile.residence],
    ['회사', profile.job],
  ];
  if (profile.mbti) rows.push(['MBTI', profile.mbti]);
  drawInfoRows(ctx, rows, ix + imageWidth + informationGap, y + imageInset, informationWidth);
}

async function drawImg(ctx: CanvasRenderingContext2D, src: string, x: number, y: number, w: number, h: number) {
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image(); el.crossOrigin = 'anonymous';
      el.onload = () => res(el); el.onerror = rej; el.src = src;
    });
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sw = w / scale, sh = h / scale;
    const sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) / 2;
    roundRect(ctx, x, y, w, h, 18, '#EDE9FE');
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 18); ctx.clip();
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    ctx.restore();
  } catch { roundRect(ctx, x, y, w, h, 18, '#EDE9FE'); }
}

function drawInfoRows(ctx: CanvasRenderingContext2D, rows: Array<[string, string]>, x: number, y: number, w: number) {
  const lw = 112, lh = 24, vp = 11; let cy = y;
  for (const [label, value] of rows) {
    const lines = wrapTextByWidth(value, w - lw - 32, t => ctx.measureText(t).width);
    const rh = Math.max(46, lines.length * lh + vp * 2);
    roundRect(ctx, x, cy, w, rh, 10, '#FFFFFF');
    ctx.strokeStyle = '#DDD6FF'; ctx.lineWidth = 2; ctx.strokeRect(x, cy, w, rh);
    ctx.fillStyle = '#F5F3FF'; ctx.fillRect(x, cy, lw, rh);
    ctx.fillStyle = '#4D179A'; ctx.font = '700 20px Arial'; ctx.fillText(label, x + 14, cy + vp + 18);
    ctx.fillStyle = '#334155'; ctx.font = '500 20px Arial';
    for (const [li, line] of lines.entries()) ctx.fillText(line, x + lw + 16, cy + vp + 18 + li * lh);
    cy += rh + 6;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
