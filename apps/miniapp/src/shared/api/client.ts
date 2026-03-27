import { env } from '../config/env';

interface ApiErrorPayload {
  code?: string;
  message?: string;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  async get<T>(path: string) {
    return this.request<T>(path, 'GET');
  }

  async patch<T>(path: string, body: unknown) {
    return this.request<T>(path, 'PATCH', body);
  }

  async post<T>(path: string, body: unknown) {
    return this.request<T>(path, 'POST', body);
  }

  private async request<T>(path: string, method: string, body?: unknown): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${env.apiBaseUrl}${path}`, {
        body: body ? JSON.stringify(body) : undefined,
        headers: {
          ...(body ? { 'content-type': 'application/json' } : {}),
          ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        },
        method,
      });
    } catch (error) {
      throw new ApiRequestError(error instanceof Error ? error.message : 'Network request failed', 0);
    }

    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
      ? (await response.json()) as T & ApiErrorPayload
      : ({ message: await response.text() } as T & ApiErrorPayload);

    if (!response.ok) {
      throw new ApiRequestError(payload.message ?? 'API request failed', response.status, payload.code);
    }

    return payload;
  }
}

export const apiClient = new ApiClient();
