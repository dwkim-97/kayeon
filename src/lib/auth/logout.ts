export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', {method: 'POST'});
  window.location.href = '/login';
}
