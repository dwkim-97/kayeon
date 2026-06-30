const PUBLIC_FILE_PATTERN = /\.(?:ico|png|jpg|jpeg|svg|webp|avif|gif|txt|xml)$/i;

export function isPublicPath(input: string) {
  const pathname = input.startsWith('http') ? new URL(input).pathname : input.split('?')[0] || '/';
  const isRootPublicFile = pathname.lastIndexOf('/') === 0 && PUBLIC_FILE_PATTERN.test(pathname);

  return pathname === '/login' || pathname === '/api/auth/login' || pathname.startsWith('/_next/') || isRootPublicFile;
}
