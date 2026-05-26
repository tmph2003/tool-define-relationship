// ── Trino Metadata Types ────────────────────────────────────────────────────

export interface SchemaItem {
  schema_name: string;
}

export interface TableItem {
  table_name: string;
  table_type: string | null;
}

export interface ColumnItem {
  column_name: string;
  data_type: string;
  is_nullable: string | null;
  column_default: string | null;
  comment: string | null;
  ordinal_position: number | null;
}

export interface TrinoConnectionRequest {
  host: string;
  port: number;
  user: string;
  catalog: string;
  http_scheme: "http" | "https";
  password?: string;
  schema?: string;
  verify?: boolean;
}

export interface TrinoConnectionResponse {
  connected: boolean;
  host: string;
  port: number;
  catalog: string;
  schema_name: string | null;
  user: string;
  message: string;
}

export interface SchemasResponse {
  catalog: string;
  schemas: SchemaItem[];
  count: number;
}

export interface TablesResponse {
  catalog: string;
  schema_name: string;
  tables: TableItem[];
  count: number;
}

export interface ColumnsResponse {
  catalog: string;
  schema_name: string;
  table_name: string;
  columns: ColumnItem[];
  count: number;
}

export interface ErrorResponse {
  detail: string;
  error_code?: string;
}

// ── Metadata Tree State ─────────────────────────────────────────────────────

export interface TableNode {
  table_name: string;
  table_type: string | null;
  columns: ColumnItem[] | null; // null = not yet loaded
  columnsLoading: boolean;
  columnsError: string | null;
}

export interface SchemaNode {
  schema_name: string;
  tables: TableNode[] | null; // null = not yet loaded
  tablesLoading: boolean;
  tablesError: string | null;
  expanded: boolean;
}

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

export interface MetadataState {
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  catalog: string | null;
  connectedHost: string | null;
  connectedUser: string | null;
  primarySchema: string | null;
  schemas: SchemaNode[];
  schemasLoading: boolean;
  schemasError: string | null;
  catalogs: string[];
  activeTreeCatalog: string | null;
}

// ── Project Save / Load Types ───────────────────────────────────────────────

import type { Node, Edge } from "@xyflow/react";

export interface ProjectSettings {
  version: string;
  theme?: string;
  [key: string]: any;
}

export interface KeyGroupColumn {
  tableId: string;
  columnName: string;
}

export interface KeyGroup {
  id: string;
  name: string;
  columns: KeyGroupColumn[];
}

export interface ProjectData {
  tables: Node[];
  relationships?: { table: string; column: string }[][]; // New standard portable format
  edges?: Edge[]; // Legacy raw React Flow format (fallback)
  key_groups: KeyGroup[];
  settings: ProjectSettings;
}
