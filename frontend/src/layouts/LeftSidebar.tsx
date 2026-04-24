import { useState, useMemo } from "react";
import { useMetadata } from "../store/MetadataContext";
import { SchemaRow } from "../components/MetadataTree";
import { useProject } from "../store/ProjectContext";

export default function LeftSidebar() {
  const { state, toggleSchema, toggleTable, addSchema } = useMetadata();
  const { activeTab } = useProject();
  const [search, setSearch] = useState("");
  const [newSchema, setNewSchema] = useState("");
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const handleToggleTableExpand = (key: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Count visible tables for footer
  const totalTables = useMemo(
    () => state.schemas.reduce((acc, sc) => acc + (sc.tables?.length ?? 0), 0),
    [state.schemas]
  );
  const totalSchemas = state.schemas.length;
  const isConnected = state.connectionStatus === "connected";

  if (activeTab === "Relations") return null;

  return (
    <aside
      className="fixed left-0 bottom-0 flex flex-col overflow-hidden group"
      style={{
        top: "var(--nav-h)",
        width: "var(--sidebar-w)",
        background: "var(--color-surface)",
        borderRight: "1px solid var(--color-border)",
      }}
    >
      {/* Resizer Handle */}
      <div
        className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize z-50 transition-colors opacity-0 group-hover:opacity-100"
        style={{ background: "transparent" }}
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-w')) || 220;
          const onMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = Math.max(150, Math.min(startWidth + moveEvent.clientX - startX, 600));
            document.documentElement.style.setProperty('--sidebar-w', `${newWidth}px`);
          };
          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'default';
          };
          document.body.style.cursor = 'col-resize';
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        }}
        onMouseOver={(e) => e.currentTarget.style.background = "var(--color-amber-dim)"}
        onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
      />
      {/* ── Search ────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "7px 10px",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            borderRadius: 3,
            padding: "4px 8px",
          }}
        >
          <span
            style={{
              color: "var(--color-text-3)",
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
              flexShrink: 0,
            }}
          >
            ⌕
          </span>
          <input
            id="sidebar-table-search"
            placeholder={isConnected ? "search tables…" : "not connected"}
            disabled={!isConnected}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 11,
              fontFamily: "JetBrains Mono, monospace",
              color: "var(--color-text-1)",
              caretColor: "var(--color-amber)",
              opacity: isConnected ? 1 : 0.4,
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-3)",
                fontSize: 10,
                fontFamily: "JetBrains Mono, monospace",
                padding: 0,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          )}
        </div>
        
        {isConnected && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newSchema) {
                addSchema(newSchema);
                setNewSchema("");
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              borderRadius: 3,
              padding: "4px 8px",
              marginTop: 6,
            }}
          >
            <span
              style={{
                color: "var(--color-text-3)",
                fontSize: 10,
                fontFamily: "JetBrains Mono, monospace",
                flexShrink: 0,
              }}
            >
              +
            </span>
            <input
              id="sidebar-add-schema"
              placeholder="add schema manually…"
              value={newSchema}
              onChange={(e) => setNewSchema(e.target.value)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 11,
                fontFamily: "JetBrains Mono, monospace",
                color: "var(--color-text-1)",
                caretColor: "var(--color-amber)",
              }}
            />
          </form>
        )}
      </div>

      {/* ── Section label ─────────────────────────────────────────────── */}
      <div
        style={{
          padding: "6px 12px 4px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span className="section-label" style={{ flex: 1 }}>
          {isConnected ? `${state.catalog} · schemas` : "metadata explorer"}
        </span>
        {state.schemasLoading && (
          <span
            style={{
              fontSize: 9,
              fontFamily: "JetBrains Mono, monospace",
              color: "var(--color-amber)",
            }}
          >
            loading…
          </span>
        )}
      </div>

      {/* ── Tree ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {/* Not connected empty state */}
        {!isConnected && state.connectionStatus !== "connecting" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              padding: "24px 16px",
              gap: 10,
              opacity: 0.5,
            }}
          >
            <span
              style={{
                fontSize: 22,
                fontFamily: "JetBrains Mono, monospace",
                color: "var(--color-text-3)",
              }}
            >
              ⬡
            </span>
            <p
              style={{
                fontSize: 10,
                fontFamily: "JetBrains Mono, monospace",
                color: "var(--color-text-3)",
                textAlign: "center",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              connect to a Trino
              <br />
              cluster to browse
              <br />
              metadata
            </p>
          </div>
        )}

        {/* Schemas error */}
        {state.schemasError && (
          <p
            style={{
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
              color: "#f87171",
              padding: "8px 12px",
              margin: 0,
            }}
          >
            ✕ {state.schemasError}
          </p>
        )}

        {/* Schema tree */}
        {isConnected && !state.schemasLoading && state.schemas.map((schema) => (
          <SchemaRow
            key={schema.schema_name}
            schema={schema}
            filter={search}
            onToggleSchema={toggleSchema}
            onToggleTable={toggleTable}
            expandedTables={expandedTables}
            onToggleTableExpand={handleToggleTableExpand}
          />
        ))}

        {/* Schemas loading skeleton */}
        {state.schemasLoading && (
          <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
            {[120, 90, 140, 80, 110].map((w, i) => (
              <div
                key={i}
                style={{
                  height: 8,
                  width: w,
                  background: "var(--color-surface-2)",
                  borderRadius: 2,
                  opacity: 0.6,
                  animation: `pulse-skeleton 1.4s ease-in-out ${i * 0.1}s infinite`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "6px 12px",
          borderTop: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span className="section-label">
          {isConnected
            ? `${totalSchemas} schemas · ${totalTables} tables`
            : "no connection"}
        </span>
        {isConnected && (
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#4ade80",
              boxShadow: "0 0 5px #4ade8066",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
        )}
      </div>
    </aside>
  );
}
