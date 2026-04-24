/**
 * API service layer — all backend communication lives here.
 * Base URL reads from Vite env (VITE_API_URL) or falls back to localhost.
 */

import type {
  TrinoConnectionRequest,
  TrinoConnectionResponse,
  SchemasResponse,
  TablesResponse,
  ColumnsResponse,
} from "../types";

const BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiError {
  detail: string;
  error_code?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err: ApiError = await res.json();
      detail = err.detail ?? detail;
    } catch {
      // leave default
    }
    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}

// ─── Trino endpoints ──────────────────────────────────────────────────────────

export async function connectTrino(params: TrinoConnectionRequest): Promise<TrinoConnectionResponse> {
  return request<TrinoConnectionResponse>("/api/v1/trino/connect", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function disconnectTrino(): Promise<void> {
  return request<void>("/api/v1/trino/disconnect", { method: "POST" });
}

export async function fetchSchemas(): Promise<SchemasResponse> {
  return request<SchemasResponse>("/api/v1/trino/schemas");
}

export async function fetchTables(schema: string): Promise<TablesResponse> {
  return request<TablesResponse>(`/api/v1/trino/tables?schema=${encodeURIComponent(schema)}`);
}

export async function fetchColumns(schema: string, table: string): Promise<ColumnsResponse> {
  return request<ColumnsResponse>(
    `/api/v1/trino/columns?schema=${encodeURIComponent(schema)}&table=${encodeURIComponent(table)}`
  );
}

export async function checkHealth(): Promise<{ status: string; trino_reachable: boolean; host?: string; catalog?: string }> {
  return request<{ status: string; trino_reachable: boolean; host?: string; catalog?: string }>("/api/v1/trino/health");
}

// ─── Backward-compat aliases (used by TrinoConnectForm, TopNavbar) ────────────

export interface TrinoConnectPayload {
  host: string;
  port: number;
  user: string;
  password?: string;
  catalog: string;
  schema?: string;
  http_scheme?: "http" | "https";
}

export type TrinoConnectResponse = TrinoConnectionResponse;

export const trinoApi = {
  connect(payload: TrinoConnectPayload): Promise<TrinoConnectResponse> {
    return request<TrinoConnectResponse>("/api/v1/trino/connect", {
      method: "POST",
      body: JSON.stringify({
        host: payload.host,
        port: payload.port,
        user: payload.user,
        ...(payload.password ? { password: payload.password } : {}),
        catalog: payload.catalog,
        ...(payload.schema ? { schema: payload.schema } : {}),
        http_scheme: payload.http_scheme ?? "http",
      }),
    });
  },
  health(): Promise<{ status: string; trino_reachable: boolean }> {
    return checkHealth();
  },
};

