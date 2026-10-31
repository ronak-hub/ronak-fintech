export function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  const current = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  return current ? decodeURIComponent(current.split('=')[1] || '') : '';
}

export function setCookie(name: string, value: string, days = 1): void {
  if (typeof document === 'undefined') return;
  const maxAge = Math.max(0, Math.floor(days * 24 * 60 * 60));
  const secure = globalThis.location?.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Strict${secure}`;
}

export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  const secure = globalThis.location?.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Strict${secure}`;
}

export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  return getCookie('session');
}

export function setAuthToken(token: string, days = 1): void {
  setCookie('session', token, days);
}

export function clearAuthToken(): void {
  deleteCookie('session');
}
