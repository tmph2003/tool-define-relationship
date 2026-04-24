import type { SchemaNode, ColumnItem, TableNode } from "../types";

// ── Type colour chip ────────────────────────────────────────────────────────
const DATA_TYPE_COLORS: Record<string, string> = {
  varchar: "#60a5fa",
  char: "#60a5fa",
  text: "#60a5fa",
  bigint: "#a78bfa",
  integer: "#a78bfa",
  int: "#a78bfa",
  smallint: "#a78bfa",
  tinyint: "#a78bfa",
  double: "#f472b6",
  float: "#f472b6",
  decimal: "#f472b6",
  boolean: "#4ade80",
  date: "#fb923c",
  timestamp: "#fb923c",
  array: "#fbbf24",
  map: "#fbbf24",
  row: "#fbbf24",
  json: "#34d399",
};

function typeColor(dt: string): string {
  const base = dt.toLowerCase().split("(")[0].trim();
  return DATA_TYPE_COLORS[base] ?? "var(--color-text-3)";
}

function typeAbbr(dt: string): string {
  const base = dt.toLowerCase().split("(")[0].trim();
  const abbrs: Record<string, string> = {
    varchar: "str", char: "str", text: "str",
    bigint: "int", integer: "int", int: "int", smallint: "int", tinyint: "int",
    double: "dbl", float: "flt", decimal: "dec",
    boolean: "bool", date: "date", timestamp: "ts",
    array: "arr", map: "map", row: "row", json: "json",
  };
  return abbrs[base] ?? base.slice(0, 4);
}

// ── Draggable Table Row ─────────────────────────────────────────────────────
interface TableRowProps {
  table: TableNode;
  schema: string;
  catalog: string;
  expanded: boolean;
  onToggle: (schema: string, table: string) => void;
}

export function TableRow({ table, schema, catalog, expanded, onToggle }: TableRowProps) {
  const hasColumns = table.columns !== null;
  const isExpanded = expanded && hasColumns;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/rd-table",
      JSON.stringify({ catalog, schema, table: table.table_name, type: table.table_type })
    );
    e.dataTransfer.effectAllowed = "copy";

    // Custom drag ghost
    const ghost = document.createElement("div");
    ghost.textContent = `◈ ${table.table_name}`;
    ghost.style.cssText = [
      "position:fixed;top:-999px;left:-999px",
      "background:#18191C",
      "border:1px solid rgba(245,166,35,0.4)",
      "color:#F5A623",
      "font-family:JetBrains Mono,monospace",
      "font-size:11px",
      "padding:4px 10px",
      "border-radius:3px",
      "pointer-events:none",
    ].join(";");
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    requestAnimationFrame(() => document.body.removeChild(ghost));
  };

  return (
    <div>
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={() => onToggle(schema, table.table_name)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 12px 3px 28px",
          cursor: "pointer",
          userSelect: "none",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      >
        {/* Expand caret */}
        <span
          style={{
            fontSize: 8,
            fontFamily: "JetBrains Mono, monospace",
            color: "var(--color-text-3)",
            width: 10,
            flexShrink: 0,
            display: "inline-block",
            transform: isExpanded ? "rotate(90deg)" : "none",
            transition: "transform 0.12s",
          }}
        >
          ▸
        </span>

        {/* Table icon */}
        <span style={{ fontSize: 9, color: "var(--color-text-3)", flexShrink: 0 }}>
          {table.table_type === "VIEW" ? "◫" : "▦"}
        </span>

        <span
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: 11,
            color: "var(--color-text-1)",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {table.table_name}
        </span>

        {/* Type badge */}
        {table.table_type === "VIEW" && (
          <span
            style={{
              fontSize: 8,
              fontFamily: "JetBrains Mono, monospace",
              color: "#a78bfa",
              background: "rgba(167,139,250,0.1)",
              padding: "1px 4px",
              borderRadius: 2,
              flexShrink: 0,
            }}
          >
            view
          </span>
        )}

        {/* Loading spinner */}
        {table.columnsLoading && (
          <span
            style={{
              fontSize: 8,
              fontFamily: "JetBrains Mono, monospace",
              color: "var(--color-amber)",
              flexShrink: 0,
            }}
          >
            ⟳
          </span>
        )}
      </div>

      {/* Columns */}
      {isExpanded && table.columns && (
        <div>
          {table.columns.map((col) => (
            <ColumnRow key={col.column_name} col={col} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Column Row ──────────────────────────────────────────────────────────────
function ColumnRow({ col }: { col: ColumnItem }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 12px 2px 44px",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <span
        style={{
          width: 4,
          height: 4,
          borderRadius: "50%",
          background: typeColor(col.data_type),
          flexShrink: 0,
          opacity: 0.7,
        }}
      />
      <span
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: 10,
          color: "var(--color-text-2)",
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {col.column_name}
      </span>
      <span
        style={{
          fontSize: 9,
          fontFamily: "JetBrains Mono, monospace",
          color: typeColor(col.data_type),
          flexShrink: 0,
          opacity: 0.8,
        }}
      >
        {typeAbbr(col.data_type)}
      </span>
    </div>
  );
}

// ── Schema Row ──────────────────────────────────────────────────────────────
interface SchemaRowProps {
  schema: SchemaNode;
  filter: string;
  onToggleSchema: (name: string) => void;
  onToggleTable: (schema: string, table: string) => void;
  expandedTables: Set<string>;
  onToggleTableExpand: (key: string) => void;
  catalog: string;
}

export function SchemaRow({
  schema,
  filter,
  onToggleSchema,
  onToggleTable,
  expandedTables,
  onToggleTableExpand,
  catalog,
}: SchemaRowProps) {
  const filteredTables = (schema.tables ?? []).filter((t) =>
    !filter || t.table_name.toLowerCase().includes(filter.toLowerCase())
  );

  // If filtering and schema has no matching tables, hide it
  if (filter && filteredTables.length === 0 && (schema.tables !== null)) return null;

  return (
    <div style={{ marginBottom: 2 }}>
      {/* Schema header */}
      <button
        onClick={() => onToggleSchema(schema.schema_name)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 12px",
          background: "none",
          border: "none",
          cursor: "pointer",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "none";
        }}
      >
        {/* Amber left rail */}
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 4,
            bottom: 4,
            width: 2,
            background: schema.expanded ? "var(--color-amber)" : "transparent",
            borderRadius: 1,
            transition: "background 0.15s",
            flexShrink: 0,
          }}
        />

        {/* Caret */}
        <span
          style={{
            fontSize: 9,
            fontFamily: "JetBrains Mono, monospace",
            color: schema.expanded ? "var(--color-amber)" : "var(--color-text-3)",
            display: "inline-block",
            transform: schema.expanded ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 0.15s",
            flexShrink: 0,
          }}
        >
          ▾
        </span>

        <span
          className="section-label"
          style={{
            color: schema.expanded ? "var(--color-text-2)" : "var(--color-text-3)",
            flex: 1,
            textAlign: "left",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            transition: "color 0.15s",
          }}
        >
          {schema.schema_name}
        </span>

        {/* Count badge */}
        {schema.tables !== null && (
          <span
            style={{
              fontSize: 9,
              fontFamily: "JetBrains Mono, monospace",
              color: "var(--color-text-3)",
              flexShrink: 0,
            }}
          >
            {schema.tables.length}
          </span>
        )}

        {/* Loading */}
        {schema.tablesLoading && (
          <span
            style={{
              fontSize: 9,
              fontFamily: "JetBrains Mono, monospace",
              color: "var(--color-amber)",
              animation: "spin 1s linear infinite",
              flexShrink: 0,
            }}
          >
            ⟳
          </span>
        )}
      </button>

      {/* Tables */}
      {schema.expanded && !schema.tablesLoading && (
        <div>
          {schema.tablesError && (
            <p
              style={{
                fontSize: 10,
                fontFamily: "JetBrains Mono, monospace",
                color: "#f87171",
                padding: "2px 12px 2px 28px",
                margin: 0,
              }}
            >
              ✕ {schema.tablesError}
            </p>
          )}
          {filteredTables.map((table) => {
            const key = `${schema.schema_name}.${table.table_name}`;
            const tableExpanded = expandedTables.has(key);
            return (
              <TableRow
                key={table.table_name}
                table={table}
                schema={schema.schema_name}
                catalog={catalog}
                expanded={tableExpanded}
                onToggle={(s, t) => {
                  onToggleTableExpand(`${s}.${t}`);
                  onToggleTable(s, t);
                }}
              />
            );
          })}
          {schema.tables !== null && filteredTables.length === 0 && !filter && (
            <p
              style={{
                fontSize: 10,
                fontFamily: "JetBrains Mono, monospace",
                color: "var(--color-text-3)",
                padding: "3px 12px 3px 28px",
                margin: 0,
              }}
            >
              no tables
            </p>
          )}
        </div>
      )}
    </div>
  );
}
