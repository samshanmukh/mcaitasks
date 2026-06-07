import { McclawApiError } from "./errors.js";

function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function deepCamel<T>(obj: unknown): T {
  if (Array.isArray(obj)) return obj.map(deepCamel) as T;
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        toCamel(k),
        deepCamel(v),
      ]),
    ) as T;
  }
  return obj as T;
}

export class HttpClient {
  private baseUrl: string;
  private getApiKey: () => string | undefined;

  constructor(baseUrl: string, getApiKey: () => string | undefined) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.getApiKey = getApiKey;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async postUnauthenticated<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body, true);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    skipAuth = false,
  ): Promise<T> {
    const headers: Record<string, string> = {};

    if (!skipAuth) {
      const apiKey = this.getApiKey();
      if (apiKey) {
        headers["X-API-Key"] = apiKey;
      }
    }

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let errorBody: { error: string };
      try {
        errorBody = (await res.json()) as { error: string };
      } catch {
        errorBody = { error: res.statusText };
      }

      const retryAfter = res.headers.get("Retry-After");
      throw new McclawApiError(
        res.status,
        errorBody,
        retryAfter ? parseInt(retryAfter, 10) : undefined,
      );
    }

    // 204 No Content
    if (res.status === 204) {
      return undefined as T;
    }

    return deepCamel<T>(await res.json());
  }

  /**
   * Raw request that returns the Response object.
   * Used for binary downloads (files).
   */
  async getRaw(path: string): Promise<Response> {
    const headers: Record<string, string> = {};

    const apiKey = this.getApiKey();
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers,
    });

    if (!res.ok) {
      let errorBody: { error: string };
      try {
        errorBody = (await res.json()) as { error: string };
      } catch {
        errorBody = { error: res.statusText };
      }
      throw new McclawApiError(res.status, errorBody);
    }

    return res;
  }
}
