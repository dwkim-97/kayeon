'use client';

import {Share2, X} from 'lucide-react';
import Script from 'next/script';
import {useState} from 'react';

import {formatBirthYearLabel} from '@/lib/profiles/age';
import {genderLabels, religionLabels} from '@/lib/profiles/options';
import type {Profile} from '@/types/profile';

// ---------- Kakao SDK types ----------

type KakaoLink = {
  mobileWebUrl: string;
  webUrl: string;
};

type KakaoContent = {
  title: string;
  description: string;
  imageUrl?: string;
  link: KakaoLink;
};

type KakaoFeedTemplate = {
  objectType: 'feed';
  content: KakaoContent;
  buttons?: Array<{title: string; link: KakaoLink}>;
};

type KakaoListTemplate = {
  objectType: 'list';
  headerTitle: string;
  headerLink: KakaoLink;
  contents: KakaoContent[]; // 2~3개
  buttons?: Array<{title: string; link: KakaoLink}>;
};

type KakaoTemplate = KakaoFeedTemplate | KakaoListTemplate;

type KakaoShareApi = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share: {
    sendDefault: (input: KakaoTemplate) => void;
    uploadImage: (input: {file: FileList | File[]}) => Promise<{infos: {original: {url: string}}}>;
  };
};

declare global {
  interface Window {
    Kakao: KakaoShareApi;
  }
}

// ---------- helpers ----------

const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY || '';
const BATCH_SIZE = 3;

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

function buildProfileDescription(profile: Profile): string {
  const parts: string[] = [profile.residence, `${profile.height}cm`, profile.job];
  if (profile.religion !== 'not_selected') parts.push(religionLabels[profile.religion]);
  if (profile.mbti) parts.push(profile.mbti);
  if (profile.hobbies) parts.push(profile.hobbies);
  if (profile.idealType) parts.push(profile.idealType);
  return parts.filter(Boolean).join(' · ');
}

function profileLink(profileId: string, origin: string): KakaoLink {
  const url = `${origin}/profiles/${profileId}`;
  return {mobileWebUrl: url, webUrl: url};
}

function buildTemplate(profiles: Profile[], origin: string): KakaoTemplate {
  const originLink: KakaoLink = {mobileWebUrl: origin, webUrl: origin};

  // 1명: 사진 1장씩 list 항목 (최대 3장)
  if (profiles.length === 1) {
    const profile = profiles[0];
    const photos = profile.photos.slice(0, 3);
    const title = formatBirthYearLabel(profile.birthYear);
    const description = buildProfileDescription(profile);
    const detailLink = profileLink(profile.id, origin);

    // list 템플릿은 2~3개 필요 — 사진 없거나 1장이면 더미 항목으로 채움
    const contents: KakaoContent[] = photos.length > 0
      ? photos.map((photo, i) => ({
          title: i === 0 ? title : `사진 ${i + 1}`,
          description: i === 0 ? description : '',
          imageUrl: photo.url,
          link: detailLink,
        }))
      : [{title, description, link: detailLink}];

    // 항목이 1개면 동일 내용으로 하나 더 추가해 list 최소 조건(2개) 충족
    if (contents.length === 1) {
      contents.push({...contents[0], description: ''});
    }

    return {
      objectType: 'list',
      headerTitle: title,
      headerLink: detailLink,
      contents,
      buttons: [{title: '자세히 보기', link: detailLink}],
    };
  }

  // 2명 이상: 프로필별 항목 1개씩, 각 항목 클릭 시 해당 프로필 상세 페이지로
  return {
    objectType: 'list',
    headerTitle: `소개 풀 (${profiles.length}명)`,
    headerLink: originLink,
    contents: profiles.map(profile => {
      const detailLink = profileLink(profile.id, origin);
      const content: KakaoContent = {
        title: formatBirthYearLabel(profile.birthYear),
        description: buildProfileDescription(profile),
        link: detailLink,
      };
      const firstPhoto = profile.photos[0];
      if (firstPhoto) content.imageUrl = firstPhoto.url;
      return content;
    }),
    buttons: [{title: '자세히 보기', link: profileLink(profiles[0].id, origin)}],
  };
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
  const [kakaoReady, setKakaoReady] = useState(false);

  const hasKakao = !!kakaoKey;
  const groups = chunk(profiles, BATCH_SIZE);
  const isSingleBatch = groups.length <= 1;

  const shareGroup = (group: Profile[]) => {
    initKakao();
    window.Kakao.Share.sendDefault(buildTemplate(group, window.location.origin));
  };

  const handleClick = () => {
    if (profiles.length === 0) return;

    if (!hasKakao || !kakaoReady) {
      void renderAndDownload(profiles);
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
      {hasKakao ? (
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.5/kakao.min.js"
          strategy="afterInteractive"
          onLoad={() => setKakaoReady(true)}
        />
      ) : null}

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

async function renderAndDownload(profiles: Profile[]) {
  const {width, cardHeight, gap, padding, height} = getShareImageLayout(profiles.length);
  const dpr = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.scale(dpr, dpr);
  context.fillStyle = '#F5F3FF';
  context.fillRect(0, 0, width, height);

  for (const [index, profile] of profiles.entries()) {
    const y = padding + index * (cardHeight + gap);
    await drawProfileCard(context, profile, padding, y, width - padding * 2, cardHeight);
  }

  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kayeon-share.png';
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

const shareImageLayoutBase = {width: 1080, cardHeight: 760, gap: 34, padding: 56};
const shareProfileCardLayout = {
  imageHeight: 640,
  imageInset: 28,
  imageWidth: 500,
  informationGap: 28,
  informationRightPadding: 28,
};

export function getShareImageLayout(profileCount: number) {
  return {
    ...shareImageLayoutBase,
    height:
      shareImageLayoutBase.padding * 2 +
      profileCount * shareImageLayoutBase.cardHeight +
      Math.max(0, profileCount - 1) * shareImageLayoutBase.gap,
  };
}

export function getShareProfileCardLayout(cardWidth: number) {
  return {
    ...shareProfileCardLayout,
    informationWidth:
      cardWidth -
      shareProfileCardLayout.imageInset -
      shareProfileCardLayout.imageWidth -
      shareProfileCardLayout.informationGap -
      shareProfileCardLayout.informationRightPadding,
  };
}

export function wrapTextByWidth(
  text: string,
  maxWidth: number,
  measureText: (value: string) => number,
): string[] {
  const normalizedText = text.trim();
  if (!normalizedText) return [''];

  const lines: string[] = [];
  let currentLine = '';

  for (const character of normalizedText) {
    if (character === ' ' && currentLine.length === 0) continue;
    const nextLine = `${currentLine}${character}`;
    if (currentLine && measureText(nextLine) > maxWidth) {
      lines.push(currentLine.trimEnd());
      currentLine = character.trimStart();
      continue;
    }
    currentLine = nextLine;
  }

  if (currentLine) lines.push(currentLine.trimEnd());
  return lines;
}

async function drawProfileCard(
  ctx: CanvasRenderingContext2D,
  profile: Profile,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  roundedRect(ctx, x, y, width, height, 28, '#FFFFFF');
  const {imageHeight, imageInset, imageWidth, informationGap, informationWidth} = getShareProfileCardLayout(width);
  const imageX = x + imageInset;
  const imageY = y + imageInset;
  const photos = profile.photos.slice(0, 4);

  for (const [i, photo] of photos.entries()) {
    const cw = photos.length === 1 ? imageWidth : (imageWidth - 8) / 2;
    const ch = photos.length === 1 ? imageHeight : (imageHeight - 8) / 2;
    const cx = imageX + (photos.length === 1 ? 0 : (i % 2) * (cw + 8));
    const cy = imageY + (photos.length === 1 ? 0 : Math.floor(i / 2) * (ch + 8));
    await drawImage(ctx, photo.url, cx, cy, cw, ch);
  }

  const textX = imageX + imageWidth + informationGap;
  const rows: Array<[string, string]> = [
    ['나이', formatBirthYearLabel(profile.birthYear)],
    ['키', `${profile.height}cm`],
    ['사는 곳', profile.residence],
    ['회사', profile.job],
  ];
  if (profile.mbti) rows.push(['MBTI', profile.mbti]);
  if (profile.hobbies) rows.push(['취미', profile.hobbies]);
  if (profile.idealType) rows.push(['이상형', profile.idealType]);
  if (profile.matchmakerComment) rows.push(['코멘트', profile.matchmakerComment]);

  drawInfoRows(ctx, rows, textX, y + imageInset, informationWidth);
}

async function drawImage(
  ctx: CanvasRenderingContext2D,
  src: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = src;
    });
    roundedRect(ctx, x, y, w, h, 18, '#EDE9FE');
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (img.naturalWidth - sw) / 2;
    const sy = (img.naturalHeight - sh) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 18);
    ctx.clip();
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    ctx.restore();
  } catch {
    roundedRect(ctx, x, y, w, h, 18, '#EDE9FE');
  }
}

function drawInfoRows(
  ctx: CanvasRenderingContext2D,
  rows: Array<[string, string]>,
  x: number,
  y: number,
  width: number,
) {
  const labelWidth = 112;
  const lineHeight = 24;
  const vPad = 11;
  let curY = y;

  for (const [label, value] of rows) {
    const lines = wrapTextByWidth(value, width - labelWidth - 32, t => ctx.measureText(t).width);
    const rowH = Math.max(46, lines.length * lineHeight + vPad * 2);

    roundedRect(ctx, x, curY, width, rowH, 10, '#FFFFFF');
    ctx.strokeStyle = '#DDD6FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, curY, width, rowH);
    ctx.fillStyle = '#F5F3FF';
    ctx.fillRect(x, curY, labelWidth, rowH);
    ctx.fillStyle = '#4D179A';
    ctx.font = '700 20px Arial';
    ctx.fillText(label, x + 14, curY + vPad + 18);
    ctx.fillStyle = '#334155';
    ctx.font = '500 20px Arial';
    for (const [li, line] of lines.entries()) {
      ctx.fillText(line, x + labelWidth + 16, curY + vPad + 18 + li * lineHeight);
    }
    curY += rowH + 6;
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
