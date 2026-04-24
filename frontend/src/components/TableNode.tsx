/**
 * TableNode — Custom React Flow node that renders a database table.
 * Each column gets its own left + right Handle for column-level connections.
 */
import { memo } from "react";
import { Handle, Position, NodeResizeControl, type NodeProps } from "@xyflow/react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ColumnDef {
  name: string;
  type: string;
  isPk?: boolean;
  isFk?: boolean;
}

export interface TableNodeData {
  label: string;
  schema?: string;
  columns: ColumnDef[];
  accent?: string;
  loading?: boolean;
}

// Type-icon colors
const TYPE_BADGE: Record<string, string> = {
  varchar: "#A78BFA",
  text: "#A78BFA",
  integer: "#4E9EFF",
  int: "#4E9EFF",
  bigint: "#4E9EFF",
  boolean: "#F59E0B",
  bool: "#F59E0B",
  timestamp: "#34D399",
  date: "#34D399",
  float: "#FB923C",
  double: "#FB923C",
  numeric: "#FB923C",
};

function typeColor(t: string): string {
  const key = t.toLowerCase().split("(")[0].trim();
  return TYPE_BADGE[key] ?? "var(--color-text-3)";
}

// ─── Component ────────────────────────────────────────────────────────────────

function ResizeIcon({ color }: { color: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke={color}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ position: 'absolute', right: 5, bottom: 5, cursor: 'nwse-resize' }}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <polyline points="16 20 20 20 20 16" />
      <line x1="14" y1="14" x2="20" y2="20" />
    </svg>
  );
}

function TableNodeInner({ data, selected }: NodeProps) {
  const { label, schema, columns, accent } = data as unknown as TableNodeData;
  const accentColor = accent ?? "var(--color-amber)";

  return (
    <>
      <NodeResizeControl
        style={{ background: 'transparent', border: 'none', visibility: selected ? 'visible' : 'hidden' }}
        minWidth={220}
        minHeight={100}
        maxHeight={60 + columns.length * 24}
      >
        <ResizeIcon color={accentColor} />
      </NodeResizeControl>
      <div
        className="table-node"
        style={{
          borderColor: selected ? accentColor : "var(--color-border-mid)",
          boxShadow: selected
            ? `0 0 0 1px ${accentColor}, 0 0 24px ${accentColor}20`
            : "0 2px 12px rgba(0,0,0,0.4)",
        }}
      >
        {/* Hidden Table-Level Handles for single-edge routing */}
        <Handle
          type="target"
          position={Position.Left}
          id="table-target"
          style={{ top: '50%', opacity: 0, pointerEvents: 'none' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="table-source"
          style={{ top: '50%', opacity: 0, pointerEvents: 'none' }}
        />

      {/* ── Header ──────────────────────────────────────────────── */}
      <div
        className="table-node-header"
        style={{ borderBottom: `2px solid ${accentColor}44` }}
      >
        <div className="flex items-center gap-1.5">
          {/* Table icon */}
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 1,
              background: accentColor,
              flexShrink: 0,
            }}
          />
          <span
            className="font-semibold text-xs truncate"
            style={{
              color: "var(--color-text-1)",
              fontFamily: "Space Grotesk, sans-serif",
              maxWidth: 150,
            }}
          >
            {label}
          </span>
        </div>
        {schema && (
          <span
            className="section-label"
            style={{ fontSize: 8, color: "var(--color-text-3)" }}
          >
            {schema}
          </span>
        )}
      </div>

      {/* ── Column rows ─────────────────────────────────────────── */}
      <div className="table-node-body nowheel">
        {(data as any).loading ? (
          <div style={{ padding: "12px", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <span
              style={{
                fontSize: 14,
                fontFamily: "JetBrains Mono, monospace",
                color: accentColor,
                animation: "spin 1s linear infinite",
              }}
            >
              ⟳
            </span>
          </div>
        ) : columns.map((col) => (
          <div key={col.name} className="table-node-col group nodrag" data-col={col.name} style={{ position: "relative" }}>
            {/* Left handle — source for incoming */}
            <Handle
              type="target"
              position={Position.Left}
              id={`${col.name}-target`}
              className="table-handle table-handle-left"
              style={{ top: "50%", zIndex: 2 }}
            />

            {/* PK / FK badge */}
            <span
              className="table-node-badge"
              style={{
                color: col.isPk
                  ? "var(--color-amber)"
                  : col.isFk
                  ? "#4E9EFF"
                  : "transparent",
              }}
            >
              {col.isPk ? "PK" : col.isFk ? "FK" : "··"}
            </span>

            {/* Column name */}
            <span className="table-node-colname truncate">{col.name}</span>

            {/* Column type */}
            <span
              className="table-node-coltype"
              style={{ color: typeColor(col.type), position: "relative", zIndex: 1 }}
            >
              {col.type}
            </span>

            {/* Right handle — source for outgoing */}
            <Handle
              type="source"
              position={Position.Right}
              id={`${col.name}-source`}
              className="table-handle table-handle-right"
              style={{ top: "50%", zIndex: 2 }}
            />
          </div>
        ))}
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="table-node-footer">
        <span>{(data as any).loading ? "loading..." : `${columns.length} columns`}</span>
      </div>
    </div>
    </>
  );
}

export default memo(TableNodeInner);
