'use client';

import {Share2} from 'lucide-react';
import Script from 'next/script';
import {useState} from 'react';

import {drinkingLabels, religionLabels, smokingLabels} from '@/lib/profiles/options';
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
            description: profiles.map(getProfileLabel).join(', '),
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
        {isSharing ? '공유 준비 중' : `카카오톡 공유 (${profiles.length})`}
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
  const width = 1080;
  const cardHeight = 700;
  const gap = 34;
  const height = 190 + profiles.length * cardHeight + Math.max(0, profiles.length - 1) * gap + 70;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas is not available.');
  }

  context.fillStyle = '#F5F3FF';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#2F0D68';
  context.font = '700 48px Arial';
  context.fillText('Kayeon 소개 프로필', 56, 82);
  context.font = '500 28px Arial';
  context.fillStyle = '#5D0EC0';
  context.fillText(`${profiles.length}명 · 카카오톡 공유용 이미지`, 56, 128);

  for (const [index, profile] of profiles.entries()) {
    const y = 170 + index * (cardHeight + gap);
    await drawProfileCard(context, profile, 56, y, width - 112, cardHeight);
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
  const imageWidth = 420;
  const imageHeight = 560;
  const imageX = x + 28;
  const imageY = y + 28;
  const photos = profile.photos.slice(0, 4);

  for (const [index, photo] of photos.entries()) {
    const cellWidth = photos.length === 1 ? imageWidth : (imageWidth - 8) / 2;
    const cellHeight = photos.length === 1 ? imageHeight : (imageHeight - 8) / 2;
    const cellX = imageX + (photos.length === 1 ? 0 : (index % 2) * (cellWidth + 8));
    const cellY = imageY + (photos.length === 1 ? 0 : Math.floor(index / 2) * (cellHeight + 8));
    await drawImage(context, photo.url, cellX, cellY, cellWidth, cellHeight);
  }

  const textX = imageX + imageWidth + 36;
  context.fillStyle = '#2F0D68';
  context.font = '800 44px Arial';
  context.fillText(getProfileLabel(profile), textX, y + 82);
  context.fillStyle = '#4D179A';
  context.font = '700 28px Arial';
  context.fillText(`${profile.height}cm · ${profile.residence}`, textX, y + 124);

  const lines = [
    `회사: ${profile.job}`,
    `종교: ${religionLabels[profile.religion]} · MBTI: ${profile.mbti || '미입력'}`,
    `흡연/음주: ${smokingLabels[profile.smoking]} / ${drinkingLabels[profile.drinking]}`,
    `취미: ${profile.hobbies || '미입력'}`,
    `이상형: ${profile.idealType || '미입력'}`,
    `코멘트: ${profile.matchmakerComment || '미입력'}`,
  ];

  context.fillStyle = '#334155';
  context.font = '500 25px Arial';
  lines.forEach((line, lineIndex) => {
    context.fillText(line.slice(0, 34), textX, y + 184 + lineIndex * 48);
  });

  context.fillStyle = '#8E51FF';
  context.font = '700 22px Arial';
  context.fillText(`등록자: ${profile.authorName}`, textX, y + height - 42);
}

async function drawImage(context: CanvasRenderingContext2D, src: string, x: number, y: number, width: number, height: number) {
  try {
    const image = await loadImage(src);
    roundedRect(context, x, y, width, height, 18, '#EDE9FE');
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const renderedWidth = image.naturalWidth * scale;
    const renderedHeight = image.naturalHeight * scale;
    const renderedX = x + (width - renderedWidth) / 2;
    const renderedY = y + (height - renderedHeight) / 2;
    context.drawImage(image, renderedX, renderedY, renderedWidth, renderedHeight);
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

function getProfileLabel(profile: Profile) {
  return `${profile.gender === 'female' ? '여성' : '남성'} ${profile.age}세`;
}
