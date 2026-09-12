/**
 * AccessibleCare Centralized Frontend API Client
 *
 * Handles HTTP requests to the FastAPI backend with configurable base URL,
 * JSON parsing, consistent errors, and Supabase Bearer token attachment.
 */

import { supabase } from './supabase';

export interface HealthResponse { status: string; [key: string]: unknown; }

export interface AuthMeResponse {
  id: string;
  role: string;
  full_name?: string | null;
  phone?: string | null;
}

export interface AuthRoleResponse { role: string; }
export interface ApiErrorPayload { detail?: string | unknown; message?: string; status?: number; }

export class ApiError extends Error {
  public status: number;
  public data: ApiErrorPayload;
  constructor(status: number, data: ApiErrorPayload) {
    const message = typeof data?.detail === 'string' ? data.detail : data?.message || `API request failed with status ${status}`;
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface RequestOptions extends RequestInit { token?: string | null; }

export class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || 'http://127.0.0.1:8000').replace(/\/+$/, '');
  }

  public setAuthToken(token: string | null): void { this.authToken = token; }
  public getAuthToken(): string | null { return this.authToken; }

  private async resolveToken(explicitToken?: string | null): Promise<string | null> {
    if (explicitToken !== undefined) return explicitToken;
    if (this.authToken) return this.authToken;
    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || null;
    } catch { return null; }
  }

  public async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${normalizedEndpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
    const token = await this.resolveToken(options.token);
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(url, { ...options, headers });
    let responseData: unknown = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try { responseData = await response.json(); } catch { /* retain null */ }
    } else {
      try { responseData = await response.text(); } catch { /* retain null */ }
    }
    if (!response.ok) {
      const errorPayload: ApiErrorPayload = typeof responseData === 'object' && responseData !== null ? responseData as ApiErrorPayload : { message: String(responseData || response.statusText) };
      throw new ApiError(response.status, errorPayload);
    }
    return responseData as T;
  }

  public async getHealth(): Promise<HealthResponse> { return this.request<HealthResponse>('/health'); }
  public async getAuthMe(token?: string | null): Promise<AuthMeResponse> { return this.request<AuthMeResponse>('/api/auth/me', { token }); }
  public async updateMyProfile(payload: { full_name: string; phone: string }, token?: string | null): Promise<AuthMeResponse> {
    return this.request<AuthMeResponse>('/api/auth/me/profile', { method: 'PUT', body: JSON.stringify(payload), token });
  }
  public async getMyRole(token?: string | null): Promise<AuthRoleResponse> { return this.request<AuthRoleResponse>('/api/auth/me/role', { token }); }
}

export const api = new ApiClient();
export default api;
