export const AUTH_COOKIE = 'kayeon_auth';

export function isValidAccessPassword(password: string) {
  const configuredPassword = process.env.KAYEON_ACCESS_PASSWORD;

  if (!configuredPassword) {
    if (process.env.NODE_ENV === 'production') {
      return false;
    }

    return password === 'kayeon-dev';
  }

  return password === configuredPassword;
}
