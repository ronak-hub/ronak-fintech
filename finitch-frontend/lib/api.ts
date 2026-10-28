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
  return process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE;
}

/** Fallback bases for local dev when the configured port is busy. */
export function getApiBaseCandidates(): string[] {
  const configured = getApiBaseUrl();
  return Array.from(
    new Set([configured, DEFAULT_API_BASE, 'http://localhost:8001', 'http://127.0.0.1:8002', 'http://localhost:8002']),
  );
}

export function getGoogleAuthUrl(): string {
  return `${getApiBaseUrl()}/auth/google/login`;
}

export function getTelemetryWebSocketUrl(userId: string | number, token: string): string {
  const apiBase = new URL(getApiBaseUrl());
  const wsProtocol = apiBase.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${apiBase.host}/api/v1/ws/telemetry/${userId}?token=${encodeURIComponent(token)}`;
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
  let lastError: unknown = null;

  for (const base of getApiBaseCandidates()) {
    try {
      return await fetch(`${base}${path}`, init);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new ApiError('Backend unavailable. Is the API running?', 503);
}

export async function fetchApiAuthed(path: string, init: RequestInit = {}): Promise<Response> {
  return fetchApi(path, {
    ...init,
    headers: authHeaders(init.headers),
  });
}

/** Try configured API base first, then local fallbacks. */
export async function fetchApiAuthedWithFallback(path: string, init: RequestInit = {}): Promise<Response> {
  let lastError: unknown = null;

  for (const base of getApiBaseCandidates()) {
    try {
      const response = await fetch(`${base}${path}`, {
        ...init,
        headers: authHeaders(init.headers),
      });
      if (response.ok || response.status === 401 || response.status === 403) {
        return response;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new ApiError('Backend unavailable. Is the API running?', 503);
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
