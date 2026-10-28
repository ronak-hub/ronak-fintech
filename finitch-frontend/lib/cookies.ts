export function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  const current = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  return current ? decodeURIComponent(current.split('=')[1] || '') : '';
}

export function setCookie(name: string, value: string, days = 1): void {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
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
