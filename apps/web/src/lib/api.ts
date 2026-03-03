// ---------------------------------------------------------------------------
// DAI Platform – Centralized API Client
// ---------------------------------------------------------------------------
// All HTTP communication with the backend lives here.  The backend is proxied
// by Vite so every request targets the relative path `/api/v1/`.
// ---------------------------------------------------------------------------

const BASE = '/api/v1';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface DataSource {
  id: string;
  name: string;
  type: string;
  icon: string;
  status: string;
  description: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  sample_values?: unknown[];
}

export interface UploadResult {
  table_name: string;
  schema_info: ColumnInfo[];
  row_count: number;
  source_type: string;
}

export interface TableInfo {
  name: string;
  row_count: number;
  column_count: number;
  source_type: string;
  created_at?: string;
}

export interface DataPreview {
  columns: string[];
  column_types: string[];
  rows: unknown[][];
  total_count: number;
  page: number;
  page_size: number;
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  row_count: number;
  execution_time_ms: number;
  sql: string;
}

export interface TransformSuggestion {
  name: string;
  description: string;
  transform_type: string;
  params: Record<string, unknown>;
  sql_preview: string;
}

export interface TransformResult {
  table_name: string;
  row_count: number;
  column_count: number;
  columns: string[];
}

export interface ChartConfig {
  id: string;
  title: string;
  chart_type: string;
  echarts_option: Record<string, unknown>;
  data_query: string;
  summary: string;
}

export interface MetricConfig {
  id: string;
  title: string;
  value: unknown;
  formatted_value: string;
  change_pct?: number;
  trend: string;
}

export interface DashboardConfig {
  charts: ChartConfig[];
  metrics: MetricConfig[];
}

export interface ChatMessage {
  role: string;
  content: string;
}

// ---------------------------------------------------------------------------
// SSE event shape yielded by sendChatMessage
// ---------------------------------------------------------------------------

export interface SSEEvent {
  type: string;
  data: unknown;
}

// ---------------------------------------------------------------------------
// Error wrapper
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    const message =
      typeof body === 'object' && body !== null && 'detail' in body
        ? String((body as { detail: unknown }).detail)
        : `API request failed with status ${status}`;
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE}${path}`;
  const headers: HeadersInit = {
    ...(options.headers as Record<string, string> | undefined),
  };

  // Set JSON content-type for non-FormData bodies
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    throw new ApiError(res.status, body);
  }

  // 204 No Content or empty body
  const text = await res.text();
  if (!text) return undefined as T;

  return JSON.parse(text) as T;
}

function queryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null,
  );
  if (entries.length === 0) return '';
  const qs = new URLSearchParams(
    entries.map(([k, v]) => [k, String(v)]),
  ).toString();
  return `?${qs}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** List available data sources. */
export async function getSources(): Promise<DataSource[]> {
  return request<DataSource[]>('/sources');
}

/** Upload a CSV file. */
export async function uploadCSV(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  return request<UploadResult>('/sources/upload', {
    method: 'POST',
    body: form,
  });
}

/** Connect to a pre-configured data source. */
export async function connectSource(
  sourceId: string,
): Promise<{ status: string }> {
  return request<{ status: string }>(`/sources/${encodeURIComponent(sourceId)}/connect`, {
    method: 'POST',
  });
}

/** List tables currently available in the data layer. */
export async function getTables(): Promise<TableInfo[]> {
  return request<TableInfo[]>('/data/tables');
}

/** Get column-level schema for a table. */
export async function getSchema(table: string): Promise<ColumnInfo[]> {
  return request<ColumnInfo[]>(`/data/tables/${encodeURIComponent(table)}/schema`);
}

/** Get a paginated data preview for a table. */
export async function getPreview(
  table: string,
  limit?: number,
  offset?: number,
): Promise<DataPreview> {
  const qs = queryString({ limit, offset });
  return request<DataPreview>(
    `/data/tables/${encodeURIComponent(table)}/preview${qs}`,
  );
}

/** Execute an arbitrary SQL query. */
export async function executeQuery(sql: string): Promise<QueryResult> {
  return request<QueryResult>('/data/query', {
    method: 'POST',
    body: JSON.stringify({ sql }),
  });
}

/** Retrieve statistics for a given table. */
export async function getTableStats(
  table: string,
): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(
    `/data/tables/${encodeURIComponent(table)}/stats`,
  );
}

/** Get AI-suggested transforms for a table. */
export async function getTransformSuggestions(
  table: string,
): Promise<TransformSuggestion[]> {
  return request<TransformSuggestion[]>(
    `/transforms/${encodeURIComponent(table)}/suggestions`,
  );
}

/** Apply a structured transform. */
export async function applyTransform(params: {
  table: string;
  transform_type: string;
  params: Record<string, unknown>;
  target_table?: string;
}): Promise<TransformResult> {
  // Backend expects `source_table`, not `table`
  const body = {
    source_table: params.table,
    transform_type: params.transform_type,
    params: params.params,
    target_table: params.target_table,
  };
  return request<TransformResult>('/transforms/apply', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Apply a free-form SQL transform. */
export async function applySQLTransform(
  sql: string,
  targetTable: string,
): Promise<TransformResult> {
  return request<TransformResult>('/transforms/sql', {
    method: 'POST',
    body: JSON.stringify({ sql, target_table: targetTable }),
  });
}

/** Get AI-suggested chart configs for a table. */
export async function suggestCharts(
  table: string,
): Promise<ChartConfig[]> {
  return request<ChartConfig[]>(
    `/reports/${encodeURIComponent(table)}/suggest`,
  );
}

/** Generate a single chart configuration. */
export async function generateChart(params: {
  table: string;
  chart_type: string;
  columns?: string[];
  title?: string;
}): Promise<ChartConfig> {
  return request<ChartConfig>('/reports/chart', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/** Generate a full dashboard for a table. */
export async function generateDashboard(
  table: string,
): Promise<DashboardConfig> {
  // Backend expects `table_name`, not `table`
  return request<DashboardConfig>('/reports/dashboard', {
    method: 'POST',
    body: JSON.stringify({ table_name: table }),
  });
}

// ---------------------------------------------------------------------------
// Chat – Server-Sent Events stream
// ---------------------------------------------------------------------------

/**
 * Send a chat message and receive a streaming SSE response.
 *
 * Returns an async generator that yields parsed `{ type, data }` event
 * objects as they arrive from the server.
 */
export async function* sendChatMessage(
  message: string,
  history: ChatMessage[],
  context?: Record<string, unknown>,
): AsyncGenerator<SSEEvent, void, undefined> {
  const url = `${BASE}/chat/message`;
  // Backend expects `conversation_history`, not `history`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversation_history: history, context }),
  });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    throw new ApiError(res.status, body);
  }

  if (!res.body) {
    throw new Error('Response body is null – SSE streaming unavailable');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by double newlines
      const parts = buffer.split('\n\n');
      // Keep the last (potentially incomplete) chunk in the buffer
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        if (!part.trim()) continue;

        let eventType = 'message';
        let dataLines: string[] = [];

        for (const line of part.split('\n')) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trim());
          }
          // Lines starting with ':' are comments – skip
        }

        if (dataLines.length === 0) continue;

        const raw = dataLines.join('\n');
        let data: unknown;
        try {
          data = JSON.parse(raw);
        } catch {
          data = raw;
        }

        yield { type: eventType, data };
      }
    }

    // Flush any remaining buffer content
    if (buffer.trim()) {
      let eventType = 'message';
      let dataLines: string[] = [];

      for (const line of buffer.split('\n')) {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim());
        }
      }

      if (dataLines.length > 0) {
        const raw = dataLines.join('\n');
        let data: unknown;
        try {
          data = JSON.parse(raw);
        } catch {
          data = raw;
        }
        yield { type: eventType, data };
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** Get contextual chat suggestions. */
export async function getChatSuggestions(
  context: Record<string, unknown>,
): Promise<string[]> {
  // Backend expects a full ChatRequest with `message` field
  const body = {
    message: 'suggest',
    conversation_history: [],
    context,
  };
  try {
    const result = await request<{ text: string; category: string }[]>('/chat/suggestions', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return Array.isArray(result) ? result.map((s) => s.text) : [];
  } catch {
    return [];
  }
}
