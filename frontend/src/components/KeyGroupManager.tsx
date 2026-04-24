import { useState, useMemo } from "react";
import { useProject } from "../store/ProjectContext";
import { useReactFlow } from "@xyflow/react";
import type { TableNodeData } from "./TableNode";

export default function KeyGroupManager() {
  const { isKeyGroupManagerOpen, setKeyGroupManagerOpen, keyGroups, setKeyGroups } = useProject();
  const { getNodes } = useReactFlow();

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  // Local state for the "Add Column" dropdowns
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [selectedColumnName, setSelectedColumnName] = useState<string>("");

  const nodes = getNodes();

  const activeGroup = useMemo(
    () => keyGroups.find((g) => g.id === selectedGroupId),
    [keyGroups, selectedGroupId]
  );

  const handleCreateGroup = () => {
    const newGroup = {
      id: `kg_${Date.now()}`,
      name: "new_key_group",
      columns: [],
    };
    setKeyGroups((prev) => [...prev, newGroup]);
    setSelectedGroupId(newGroup.id);
  };

  const handleUpdateName = (name: string) => {
    if (!selectedGroupId) return;
    setKeyGroups((prev) =>
      prev.map((g) => (g.id === selectedGroupId ? { ...g, name } : g))
    );
  };

  const handleDeleteGroup = (id: string) => {
    setKeyGroups((prev) => prev.filter((g) => g.id !== id));
    if (selectedGroupId === id) setSelectedGroupId(null);
  };

  const handleAddColumn = () => {
    if (!selectedGroupId || !selectedTableId || !selectedColumnName) return;
    setKeyGroups((prev) =>
      prev.map((g) => {
        if (g.id !== selectedGroupId) return g;
        // Avoid duplicates
        const exists = g.columns.some(
          (c) => c.tableId === selectedTableId && c.columnName === selectedColumnName
        );
        if (exists) return g;
        return {
          ...g,
          columns: [...g.columns, { tableId: selectedTableId, columnName: selectedColumnName }],
        };
      })
    );
    setSelectedColumnName("");
  };

  const handleRemoveColumn = (tableId: string, columnName: string) => {
    if (!selectedGroupId) return;
    setKeyGroups((prev) =>
      prev.map((g) => {
        if (g.id !== selectedGroupId) return g;
        return {
          ...g,
          columns: g.columns.filter((c) => !(c.tableId === tableId && c.columnName === columnName)),
        };
      })
    );
  };

  if (!isKeyGroupManagerOpen) return null;

  // Options for the dropdown
  const selectedTableNode = nodes.find((n) => n.id === selectedTableId);
  const selectedTableData = selectedTableNode?.data as unknown as TableNodeData | undefined;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-8 animate-fade-in">
      <div
        className="flex w-full max-w-4xl h-full max-h-[600px] overflow-hidden rounded-md shadow-2xl animate-slide-up"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* LEFT PANE: Key Groups List */}
        <div
          className="w-1/3 flex flex-col"
          style={{ borderRight: "1px solid var(--color-border)" }}
        >
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <span className="font-semibold text-sm" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--color-text-1)" }}>
              Business Key Groups
            </span>
            <button
              onClick={handleCreateGroup}
              className="px-2 py-1 rounded-sm text-xs font-semibold transition-colors"
              style={{
                background: "var(--color-amber-dim)",
                color: "var(--color-amber)",
                border: "1px solid rgba(245,166,35,0.3)",
                fontFamily: "Space Grotesk, sans-serif",
                cursor: "pointer",
              }}
            >
              + New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {keyGroups.length === 0 ? (
              <div className="text-center p-4 section-label" style={{ fontSize: 10, color: "var(--color-text-3)" }}>
                No key groups defined
              </div>
            ) : (
              keyGroups.map((g) => (
                <div
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className="flex items-center justify-between px-3 py-2 mb-1 rounded-sm cursor-pointer transition-colors"
                  style={{
                    background: selectedGroupId === g.id ? "var(--color-surface-2)" : "transparent",
                    border: `1px solid ${selectedGroupId === g.id ? "var(--color-border-mid)" : "transparent"}`,
                  }}
                >
                  <span
                    className="text-xs truncate font-medium"
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      color: selectedGroupId === g.id ? "var(--color-amber)" : "var(--color-text-2)",
                    }}
                  >
                    {g.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(g.id);
                    }}
                    className="opacity-50 hover:opacity-100 hover:text-red-400 text-xs"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANE: Group Details */}
        <div className="flex-1 flex flex-col relative">
          <button
            onClick={() => setKeyGroupManagerOpen(false)}
            className="absolute top-3 right-4 text-lg"
            style={{ color: "var(--color-text-3)", cursor: "pointer", background: "none", border: "none" }}
          >
            ×
          </button>

          {!activeGroup ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-2">
              <span style={{ fontSize: 24, color: "var(--color-text-3)", fontFamily: "JetBrains Mono, monospace" }}>◰</span>
              <span className="section-label" style={{ fontSize: 10 }}>Select or create a key group</span>
            </div>
          ) : (
            <>
              {/* Header Editor */}
              <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <span className="section-label mb-1 block" style={{ fontSize: 9 }}>GROUP NAME</span>
                <input
                  value={activeGroup.name}
                  onChange={(e) => handleUpdateName(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-lg font-semibold"
                  style={{
                    fontFamily: "Space Grotesk, sans-serif",
                    color: "var(--color-text-1)",
                    caretColor: "var(--color-amber)",
                  }}
                  placeholder="e.g. customer_key_group"
                />
              </div>

              {/* Columns List */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <span className="section-label mb-3 block" style={{ fontSize: 9 }}>MAPPED COLUMNS ({activeGroup.columns.length})</span>
                
                {activeGroup.columns.length === 0 && (
                  <div className="text-center py-6 text-xs" style={{ color: "var(--color-text-3)", fontStyle: "italic" }}>
                    No columns mapped yet
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {activeGroup.columns.map((col, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2 rounded-sm"
                      style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: "var(--color-amber)", fontFamily: "JetBrains Mono, monospace" }}>
                          {col.tableId}
                        </span>
                        <span style={{ color: "var(--color-text-3)", fontSize: 10 }}>.</span>
                        <span className="text-xs font-semibold" style={{ color: "var(--color-text-1)", fontFamily: "JetBrains Mono, monospace" }}>
                          {col.columnName}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveColumn(col.tableId, col.columnName)}
                        className="text-xs hover:text-red-400"
                        style={{ color: "var(--color-text-3)", background: "none", border: "none", cursor: "pointer" }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Column Footer */}
              <div className="p-4" style={{ background: "var(--color-surface-2)", borderTop: "1px solid var(--color-border)" }}>
                <span className="section-label mb-2 block" style={{ fontSize: 9 }}>ADD EQUIVALENT COLUMN</span>
                <div className="flex gap-2">
                  <select
                    value={selectedTableId}
                    onChange={(e) => {
                      setSelectedTableId(e.target.value);
                      setSelectedColumnName(""); // reset column when table changes
                    }}
                    className="flex-1 px-2 py-1.5 text-xs outline-none rounded-sm"
                    style={{ background: "var(--color-bg)", color: "var(--color-text-2)", border: "1px solid var(--color-border)" }}
                  >
                    <option value="" disabled>Select Table...</option>
                    {nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {((n.data as unknown) as TableNodeData)?.label || n.id}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedColumnName}
                    onChange={(e) => setSelectedColumnName(e.target.value)}
                    disabled={!selectedTableId}
                    className="flex-1 px-2 py-1.5 text-xs outline-none rounded-sm disabled:opacity-50"
                    style={{ background: "var(--color-bg)", color: "var(--color-text-2)", border: "1px solid var(--color-border)" }}
                  >
                    <option value="" disabled>Select Column...</option>
                    {selectedTableData?.columns?.map((c: { name: string }) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>

                  <button
                    onClick={handleAddColumn}
                    disabled={!selectedTableId || !selectedColumnName}
                    className="px-4 py-1.5 rounded-sm text-xs font-semibold disabled:opacity-50 transition-colors"
                    style={{
                      background: "var(--color-amber)",
                      color: "var(--color-bg)",
                      border: "none",
                      cursor: selectedTableId && selectedColumnName ? "pointer" : "default",
                      fontFamily: "Space Grotesk, sans-serif",
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
