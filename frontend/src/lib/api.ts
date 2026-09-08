/**
 * AccessibleCare Centralized Frontend API Client
 *
 * Handles HTTP requests to the FastAPI backend with:
 * - Configurable base URL (VITE_API_BASE_URL)
 * - Automatic JSON parsing
 * - Consistent error handling
 * - Bearer token attachment for authenticated requests
 */

export interface HealthResponse {
  status: string;
  [key: string]: unknown;
}

export interface AuthMeResponse {
  id: string;
  role: string;
  full_name?: string | null;
}

export interface ApiErrorPayload {
  detail?: string | unknown;
  message?: string;
  status?: number;
}

export class ApiError extends Error {
  public status: number;
  public data: ApiErrorPayload;

  constructor(status: number, data: ApiErrorPayload) {
    const message =
      typeof data?.detail === 'string'
        ? data.detail
        : data?.message || `API request failed with status ${status}`;
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface RequestOptions extends RequestInit {
  token?: string | null;
}

export class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = (
      baseUrl ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
      'http://127.0.0.1:8000'
    ).replace(/\/+$/, '');
  }

  /**
   * Set or clear the active Supabase access token for authenticated requests.
   */
  public setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  /**
   * Get the current active auth token.
   */
  public getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Core request wrapper.
   */
  public async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const normalizedEndpoint = endpoint.startsWith('/')
      ? endpoint
      : `/${endpoint}`;
    const url = `${this.baseUrl}${normalizedEndpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    // Attach Bearer token if provided explicitly or configured globally
    const token = options.token !== undefined ? options.token : this.authToken;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    const response = await fetch(url, config);

    let responseData: unknown = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch {
        // retain null default
      }
    } else {
      try {
        responseData = await response.text();
      } catch {
        // retain null default
      }
    }

    if (!response.ok) {
      const errorPayload: ApiErrorPayload =
        typeof responseData === 'object' && responseData !== null
          ? (responseData as ApiErrorPayload)
          : { message: String(responseData || response.statusText) };

      throw new ApiError(response.status, errorPayload);
    }

    return responseData as T;
  }

  /**
   * GET /health — System health check
   */
  public async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  /**
   * GET /api/auth/me — Retrieve authenticated user profile
   */
  public async getAuthMe(token?: string | null): Promise<AuthMeResponse> {
    return this.request<AuthMeResponse>('/api/auth/me', { token });
  }
}

// Export default singleton instance
export const api = new ApiClient();
export default api;
