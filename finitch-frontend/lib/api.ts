import { clearAuthToken, getAuthToken } from '@/lib/cookies';

const DEFAULT_API_BASE = 'http://127.0.0.1:8001';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Primary backend URL from env (single source of truth). */
export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_API_BASE_URL must be set for production builds.');
  }
  if (!configured) {
    return DEFAULT_API_BASE;
  }

  const parsed = new URL(configured);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL must use HTTP or HTTPS.');
  }
  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_API_BASE_URL must use HTTPS in production.');
  }
  return configured.replace(/\/+$/, '');
}

/** Keep auth requests on the configured origin; never forward credentials to fallback hosts. */
export function getApiBaseCandidates(): string[] {
  return [getApiBaseUrl()];
}

export function getGoogleAuthUrl(): string {
  return `${getApiBaseUrl()}/auth/google/login`;
}

export function getTelemetryWebSocketUrl(token: string): { url: string; protocols: string[] } {
  const apiBase = new URL(getApiBaseUrl());
  const wsProtocol = apiBase.protocol === 'https:' ? 'wss:' : 'ws:';
  return {
    url: `${wsProtocol}//${apiBase.host}/api/v1/ws/telemetry`,
    protocols: ['vaultic.telemetry', `vaultic.auth.${token}`],
  };
}

function authHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  const token = getAuthToken();
  if (!token) {
    throw new ApiError('Not authenticated', 401);
  }
  headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

export async function fetchApi(path: string, init: RequestInit = {}): Promise<Response> {
  const url = `${getApiBaseUrl()}${path}`;
  return fetch(url, init);
}

export async function fetchApiWithFallback(path: string, init: RequestInit = {}): Promise<Response> {
  return fetchApi(path, init);
}

export async function fetchApiAuthed(path: string, init: RequestInit = {}): Promise<Response> {
  return fetchApi(path, {
    ...init,
    headers: authHeaders(init.headers),
  });
}

/** Try configured API base first, then local fallbacks. */
export async function fetchApiAuthedWithFallback(path: string, init: RequestInit = {}): Promise<Response> {
  return fetchApiAuthed(path, init);
}

export async function postJsonAuthed<T = unknown>(path: string, body: unknown): Promise<T> {
  const response = await fetchApiAuthed(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    clearAuthToken();
    throw new ApiError('Session expired', 401);
  }

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      detail = payload?.detail || detail;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(detail, response.status);
  }

  return response.json() as Promise<T>;
}

export async function getJsonAuthed<T = unknown>(path: string): Promise<T> {
  const response = await fetchApiAuthedWithFallback(path);
  if (response.status === 401) {
    clearAuthToken();
    throw new ApiError('Session expired', 401);
  }
  if (!response.ok) {
    throw new ApiError(`Request failed (${response.status})`, response.status);
  }
  return response.json() as Promise<T>;
}

export async function setupUserProfile(payload: Record<string, unknown>): Promise<void> {
  await postJsonAuthed('/user/setup', payload);
}

export async function fetchDashboardSummary<T = unknown>(): Promise<T> {
  return getJsonAuthed<T>('/dashboard/summary');
}
