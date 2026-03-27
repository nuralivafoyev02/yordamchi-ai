import { env } from '../config/env';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  async get(path: string) {
    return this.request(path, 'GET');
  }

  async patch(path: string, body: unknown) {
    return this.request(path, 'PATCH', body);
  }

  async post(path: string, body: unknown) {
    return this.request(path, 'POST', body);
  }

  private async request(path: string, method: string, body?: unknown) {
    const response = await fetch(`${env.apiBaseUrl}${path}`, {
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      },
      method,
    });

    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error((payload.message as string | undefined) ?? 'API request failed');
    }

    return payload;
  }
}

export const apiClient = new ApiClient();
