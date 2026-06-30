'use client';

import {Share2} from 'lucide-react';
import Script from 'next/script';
import {useState} from 'react';

import {formatBirthYearLabel} from '@/lib/profiles/age';
import {genderLabels} from '@/lib/profiles/options';
import {getProfileInformationRows, type ProfileInformationRow} from '@/lib/profiles/information';
import type {Profile} from '@/types/profile';

type KakaoShareApi = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share: {
    uploadImage: (input: {file: FileList | File[]}) => Promise<{infos: {original: {url: string}}}>;
    sendDefault: (input: {
      objectType: 'feed';
      content: {
        title: string;
        description: string;
        imageUrl: string;
        link: {
          mobileWebUrl: string;
          webUrl: string;
        };
      };
      buttons: Array<{
        title: string;
        link: {
          mobileWebUrl: string;
          webUrl: string;
        };
      }>;
    }) => void;
  };
};

declare global {
  interface Window {
    Kakao: KakaoShareApi;
  }
}

type ShareButtonProps = {
  profiles: Profile[];
};

const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY || '';
const shareImageLayoutBase = {
  width: 1080,
  cardHeight: 760,
  gap: 34,
  padding: 56,
};
const shareProfileCardLayout = {
  imageHeight: 640,
  imageInset: 28,
  imageWidth: 500,
  informationGap: 28,
  informationRightPadding: 28,
};

export function ShareButton({profiles}: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (profiles.length === 0 || isSharing) {
      return;
    }

    setIsSharing(true);

    try {
      const blob = await renderShareImage(profiles);
      const file = new File([blob], 'kayeon-share.png', {type: 'image/png'});

      if (kakaoKey && window.Kakao?.Share) {
        if (!window.Kakao.isInitialized()) {
          window.Kakao.init(kakaoKey);
        }

        const uploaded = await window.Kakao.Share.uploadImage({file: createUploadFiles(file)});
        window.Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: `소개 프로필 ${profiles.length}명`,
            description: profiles.map(getShareProfileLabel).join(', '),
            imageUrl: uploaded.infos.original.url,
            link: {
              mobileWebUrl: window.location.origin,
              webUrl: window.location.origin,
            },
          },
          buttons: [
            {
              title: '확인',
              link: {
                mobileWebUrl: window.location.origin,
                webUrl: window.location.origin,
              },
            },
          ],
        });
        return;
      }

      downloadBlob(blob, 'kayeon-share.png');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      {kakaoKey ? <Script src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.5/kakao.min.js" strategy="afterInteractive" /> : null}
      <button
        className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-[var(--violet-600)] px-4 font-bold text-white shadow-[0_12px_30px_rgba(127,34,254,0.24)] transition hover:bg-[var(--violet-700)] disabled:bg-[var(--violet-200)]"
        type="button"
        disabled={profiles.length === 0 || isSharing}
        onClick={handleShare}
      >
        <Share2 size={17} aria-hidden />
        {isSharing ? '공유 준비 중' : `공유 이미지 생성 (${profiles.length})`}
      </button>
    </>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function createUploadFiles(file: File) {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  return transfer.files;
}

async function renderShareImage(profiles: Profile[]) {
  const {width, cardHeight, gap, padding, height} = getShareImageLayout(profiles.length);
  const dpr = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const context = canvas.getContext('2d');
  if (context) context.scale(dpr, dpr);

  if (!context) {
    throw new Error('Canvas is not available.');
  }

  context.fillStyle = '#F5F3FF';
  context.fillRect(0, 0, width, height);

  for (const [index, profile] of profiles.entries()) {
    const y = padding + index * (cardHeight + gap);
    await drawProfileCard(context, profile, padding, y, width - padding * 2, cardHeight);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Failed to create share image.'));
        return;
      }

      resolve(blob);
    }, 'image/png');
  });
}

async function drawProfileCard(
  context: CanvasRenderingContext2D,
  profile: Profile,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  roundedRect(context, x, y, width, height, 28, '#FFFFFF');
  const {imageHeight, imageInset, imageWidth, informationGap, informationWidth} = getShareProfileCardLayout(width);
  const imageX = x + imageInset;
  const imageY = y + imageInset;
  const photos = profile.photos.slice(0, 4);

  for (const [index, photo] of photos.entries()) {
    const cellWidth = photos.length === 1 ? imageWidth : (imageWidth - 8) / 2;
    const cellHeight = photos.length === 1 ? imageHeight : (imageHeight - 8) / 2;
    const cellX = imageX + (photos.length === 1 ? 0 : (index % 2) * (cellWidth + 8));
    const cellY = imageY + (photos.length === 1 ? 0 : Math.floor(index / 2) * (cellHeight + 8));
    await drawImage(context, photo.url, cellX, cellY, cellWidth, cellHeight);
  }

  const textX = imageX + imageWidth + informationGap;
  const textY = y + imageInset;
  drawInformationRows(context, getProfileInformationRows(profile), textX, textY, informationWidth);
}

async function drawImage(context: CanvasRenderingContext2D, src: string, x: number, y: number, width: number, height: number) {
  try {
    const image = await loadImage(src);
    roundedRect(context, x, y, width, height, 18, '#EDE9FE');

    // object-fit: cover — scale to fill, clip overflow
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const renderedWidth = image.naturalWidth * scale;
    const renderedHeight = image.naturalHeight * scale;
    const srcX = (renderedWidth - width) / 2 / scale;
    const srcY = (renderedHeight - height) / 2 / scale;
    const srcW = width / scale;
    const srcH = height / scale;

    context.save();
    context.beginPath();
    context.roundRect(x, y, width, height, 18);
    context.clip();
    context.drawImage(image, srcX, srcY, srcW, srcH, x, y, width, height);
    context.restore();
  } catch {
    roundedRect(context, x, y, width, height, 18, '#EDE9FE');
    context.fillStyle = '#5D0EC0';
    context.font = '700 22px Arial';
    context.fillText('사진을 불러오지 못했습니다', x + 28, y + height / 2);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
  context.fillStyle = fillStyle;
  context.fill();
}

function drawInformationRows(
  context: CanvasRenderingContext2D,
  rows: ProfileInformationRow[],
  x: number,
  y: number,
  width: number,
) {
  const minimumRowHeight = 46;
  const rowGap = 6;
  const labelWidth = 112;
  const lineHeight = 24;
  const verticalPadding = 11;
  let currentY = y;

  for (const [label, value] of rows) {
    const valueX = x + labelWidth + 16;
    const valueWidth = width - labelWidth - 32;
    const valueLines = wrapTextByWidth(value, valueWidth, text => context.measureText(text).width);
    const rowHeight = Math.max(minimumRowHeight, valueLines.length * lineHeight + verticalPadding * 2);

    roundedRect(context, x, currentY, width, rowHeight, 10, '#FFFFFF');
    context.strokeStyle = '#DDD6FF';
    context.lineWidth = 2;
    context.strokeRect(x, currentY, width, rowHeight);

    context.fillStyle = '#F5F3FF';
    context.fillRect(x, currentY, labelWidth, rowHeight);
    context.fillStyle = '#4D179A';
    context.font = '700 20px Arial';
    context.fillText(label, x + 14, currentY + verticalPadding + 18);

    context.fillStyle = '#334155';
    context.font = '500 20px Arial';
    for (const [lineIndex, line] of valueLines.entries()) {
      context.fillText(line, valueX, currentY + verticalPadding + 18 + lineIndex * lineHeight);
    }

    currentY += rowHeight + rowGap;
  }
}

type TextMeasure = (value: string) => number;

export function wrapTextByWidth(text: string, maxWidth: number, measureText: TextMeasure) {
  const normalizedText = text.trim();

  if (!normalizedText) {
    return [''];
  }

  const lines: string[] = [];
  let currentLine = '';

  for (const character of normalizedText) {
    if (character === ' ' && currentLine.length === 0) {
      continue;
    }

    const nextLine = `${currentLine}${character}`;

    if (currentLine && measureText(nextLine) > maxWidth) {
      lines.push(currentLine.trimEnd());
      currentLine = character.trimStart();
      continue;
    }

    currentLine = nextLine;
  }

  if (currentLine) {
    lines.push(currentLine.trimEnd());
  }

  return lines;
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

export function getShareImageLayout(profileCount: number) {
  return {
    ...shareImageLayoutBase,
    height:
      shareImageLayoutBase.padding * 2 +
      profileCount * shareImageLayoutBase.cardHeight +
      Math.max(0, profileCount - 1) * shareImageLayoutBase.gap,
  };
}

export function getShareProfileLabel(profile: Profile) {
  return `${genderLabels[profile.gender]} ${formatBirthYearLabel(profile.birthYear)}`;
}

