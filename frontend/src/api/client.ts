import type { ApiErrorBody } from './types';

const TOKEN_KEY = 'horario.token';
const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
};

/** Error de la API con el formato de contracts/README.md. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: ApiErrorBody['code'];
  readonly messages: string[];

  constructor(body: ApiErrorBody) {
    const messages = Array.isArray(body.message) ? body.message : [body.message];
    super(messages.join('. '));
    this.status = body.statusCode;
    this.code = body.code;
    this.messages = messages;
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** Cliente fetch tipado: añade el token y, ante un 401, cierra la sesión y va a /login. */
export async function apiRequest<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const token = tokenStorage.get();
  const response = await fetch(`${API_URL}/api${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && token) {
    tokenStorage.clear();
    window.location.assign('/login');
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      errorBody ?? { statusCode: response.status, message: 'No se pudo conectar con el servidor' },
    );
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export const api = {
  get: <T>(path: string) => apiRequest<T>('GET', path),
  post: <T>(path: string, body?: unknown) => apiRequest<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => apiRequest<T>('PATCH', path, body),
  delete: (path: string) => apiRequest<void>('DELETE', path),
};
