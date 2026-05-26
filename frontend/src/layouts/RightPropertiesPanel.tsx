import { useState } from "react";
import { useReactFlow, useEdges } from "@xyflow/react";
import { useProject } from "../store/ProjectContext";

export type EdgeData = {
  description?: string;
  relations?: { sourceCol: string; targetCol: string }[];
};


function PropertyInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className="flex items-start gap-2 py-2 px-3 group"
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      <span
        className="section-label shrink-0 pt-1"
        style={{ width: 110, fontSize: 9, color: "var(--color-text-3)" }}
      >
        {label}
      </span>
      {type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent border-none outline-none text-xs resize-none"
          rows={3}
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            color: focused ? "var(--color-text-1)" : "var(--color-text-2)",
            caretColor: "var(--color-amber)",
            borderBottom: focused ? "1px solid var(--color-amber)" : "1px solid transparent",
            transition: "border-color 0.15s, color 0.15s",
          }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent border-none outline-none text-xs truncate"
          style={{
            fontFamily: "JetBrains Mono, monospace",
            color: focused ? "var(--color-text-1)" : "var(--color-text-2)",
            caretColor: "var(--color-amber)",
            borderBottom: focused ? "1px solid var(--color-amber)" : "1px solid transparent",
            transition: "border-color 0.15s, color 0.15s",
          }}
        />
      )}
    </div>
  );
}

/** Renders one column endpoint of a relationship edge. */
function ColumnEndpoint({ tableId, column, onChange }: { tableId: string; column: string; onChange: (val: string) => void }) {
  const { getNode } = useReactFlow();
  const node = getNode(tableId);
  const columns = node ? ((node.data as any).columns as any[]) : [];
  
  const tableName = tableId.includes(".") ? tableId.split(".").pop() : tableId;
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-sm w-full"
      style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
    >
      <span
        className="text-xs font-medium truncate shrink-0"
        style={{ color: "var(--color-amber)", fontFamily: "JetBrains Mono, monospace", fontSize: 10, maxWidth: "45%" }}
      >
        {tableName}
      </span>
      <span className="shrink-0" style={{ color: "var(--color-text-3)", fontSize: 10 }}>.</span>
      <select
        value={column}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent border-none outline-none text-xs cursor-pointer truncate flex-1 min-w-0"
        style={{
          color: "var(--color-text-2)",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
        }}
      >
        {columns?.map((c) => (
          <option
            key={c.name}
            value={c.name}
            style={{ background: "var(--color-surface)", color: "var(--color-text-1)" }}
          >
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function RightPropertiesPanel() {
  const { setEdges, setNodes, getEdges, getNode } = useReactFlow();
  const edges = useEdges();
  const { captureHistory, selectedEdgeId, setSelectedEdgeId, selectedNodeId, setSelectedNodeId, activeTab, setIsDirty } = useProject();

  if (activeTab === "Relations") return null;

  const selectedEdge = selectedEdgeId ? edges.find(e => e.id === selectedEdgeId) : null;
  const selectedNode = selectedNodeId ? getNode(selectedNodeId) : undefined;

  const handleDeleteNode = () => {
    if (!selectedNode) return;
    captureHistory();
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNodeId(null);
    setIsDirty(true);
  };

  const updateEdgeData = (key: keyof EdgeData, value: any) => {
    if (!selectedEdge) return;
    captureHistory();
    setEdges((eds) =>
      eds.map((e) =>
        e.id === selectedEdge.id
          ? {
              ...e,
              data: { ...(e.data as EdgeData || {}), [key]: value },
            }
          : e
      )
    );
    setIsDirty(true);
  };

  if (!selectedEdge && !selectedNode) {
    return (
      <aside
        className="fixed right-0 bottom-0 flex flex-col overflow-hidden group"
        style={{
          top: "var(--nav-h)",
          width: "var(--panel-w)",
          background: "var(--color-surface)",
          borderLeft: "1px solid var(--color-border)",
        }}
      >
        {/* Resizer Handle */}
        <div
          className="absolute top-0 left-0 bottom-0 w-1.5 cursor-col-resize z-50 transition-colors opacity-0 group-hover:opacity-100"
          style={{ background: "transparent" }}
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--panel-w')) || 280;
            const onMouseMove = (moveEvent: MouseEvent) => {
              const newWidth = Math.max(200, Math.min(startWidth + startX - moveEvent.clientX, 600));
              document.documentElement.style.setProperty('--panel-w', `${newWidth}px`);
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
        <div className="flex-1 flex items-center justify-center opacity-50 flex-col gap-2 p-6 text-center">
          <span style={{ fontSize: 24, color: "var(--color-text-3)", fontFamily: "JetBrains Mono, monospace" }}>◰</span>
          <span className="section-label" style={{ fontSize: 9 }}>Select a node or edge to view properties</span>
        </div>
      </aside>
    );
  }

  if (selectedNode) {
    const connectedEdges = getEdges().filter(e => e.source === selectedNode.id || e.target === selectedNode.id);
    
    return (
      <aside
        className="fixed right-0 bottom-0 flex flex-col overflow-hidden animate-slide-left group"
        style={{
          top: "var(--nav-h)",
          width: "var(--panel-w)",
          background: "var(--color-surface)",
          borderLeft: "1px solid var(--color-border)",
        }}
      >
        {/* Resizer Handle */}
        <div
          className="absolute top-0 left-0 bottom-0 w-1.5 cursor-col-resize z-50 transition-colors opacity-0 group-hover:opacity-100"
          style={{ background: "transparent" }}
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--panel-w')) || 280;
            const onMouseMove = (moveEvent: MouseEvent) => {
              const newWidth = Math.max(200, Math.min(startWidth + startX - moveEvent.clientX, 600));
              document.documentElement.style.setProperty('--panel-w', `${newWidth}px`);
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
        <div
          className="px-3 py-2.5 flex items-center justify-between shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <span
            className="font-medium text-xs truncate"
            style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--color-text-1)", maxWidth: 150 }}
          >
            {selectedNode.data?.label as string}
          </span>
          <span className="section-label" style={{ color: "var(--color-amber)", fontSize: 9 }}>
            TABLE
          </span>
        </div>
        <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="flex flex-col gap-3">
            <span className="section-label" style={{ fontSize: 10, color: "var(--color-text-3)" }}>
              CONNECTED RELATIONSHIPS ({connectedEdges.length})
            </span>
            {connectedEdges.length === 0 ? (
              <div className="text-center opacity-50 py-4">
                <span style={{ fontSize: 11, color: "var(--color-text-3)" }}>No relationships</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {connectedEdges.flatMap(edge => {
                  const sTable = edge.source.includes(".") ? edge.source.split(".").pop() : edge.source;
                  const tTable = edge.target.includes(".") ? edge.target.split(".").pop() : edge.target;
                  const relations = (edge.data?.relations as any[]) || [];
                  
                  if (relations.length === 0) {
                     return [(
                        <div 
                          key={edge.id} 
                          className="px-3 py-2 rounded-sm cursor-pointer transition-colors" 
                          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-mid)" }}
                          onClick={() => {
                            setSelectedEdgeId(edge.id);
                            setSelectedNodeId(null);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "var(--color-amber)";
                            e.currentTarget.style.background = "var(--color-amber-dim)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--color-border-mid)";
                            e.currentTarget.style.background = "var(--color-surface-2)";
                          }}
                        >
                          <div className="text-xs italic text-gray-500">Empty relationship between {sTable} and {tTable}</div>
                        </div>
                     )];
                  }

                  return relations.map((rel, idx) => (
                    <div 
                      key={`${edge.id}-${idx}`} 
                      className="px-3 py-2 rounded-sm cursor-pointer transition-colors" 
                      style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-mid)" }}
                      onClick={() => {
                        setSelectedEdgeId(edge.id);
                        setSelectedNodeId(null);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--color-amber)";
                        e.currentTarget.style.background = "var(--color-amber-dim)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--color-border-mid)";
                        e.currentTarget.style.background = "var(--color-surface-2)";
                      }}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs truncate">
                          <span style={{ color: "var(--color-text-3)", fontSize: 10 }}>from</span>
                          <span style={{ color: "var(--color-amber)", fontFamily: "JetBrains Mono, monospace", fontSize: 10 }}>{sTable}.{rel.sourceCol || "???"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs truncate">
                          <span style={{ color: "var(--color-text-3)", fontSize: 10 }}>to</span>
                          <span style={{ color: "#4E9EFF", fontFamily: "JetBrains Mono, monospace", fontSize: 10 }}>{tTable}.{rel.targetCol || "???"}</span>
                        </div>
                      </div>
                    </div>
                  ));
                })}
              </div>
                )}
              </div>
        </div>
        <div className="p-4 pt-0 shrink-0">
          <button
            onClick={handleDeleteNode}
            style={{
              padding: "8px",
              width: "100%",
              background: "rgba(220, 38, 38, 0.1)",
              color: "#EF4444",
              border: "1px solid rgba(220, 38, 38, 0.2)",
              borderRadius: "4px",
              fontSize: "11px",
              fontFamily: "Space Grotesk, sans-serif",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(220, 38, 38, 0.2)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(220, 38, 38, 0.1)";
            }}
          >
            Delete Table from Canvas
          </button>
        </div>
      </aside>
    );
  }

  if (!selectedEdge) return null;

  const data = (selectedEdge.data as EdgeData) || {};

  return (
    <aside
      className="fixed right-0 bottom-0 flex flex-col overflow-hidden animate-slide-left group"
      style={{
        top: "var(--nav-h)",
        width: "var(--panel-w)",
        background: "var(--color-surface)",
        borderLeft: "1px solid var(--color-border)",
      }}
    >
      {/* Resizer Handle */}
      <div
        className="absolute top-0 left-0 bottom-0 w-1.5 cursor-col-resize z-50 transition-colors opacity-0 group-hover:opacity-100"
        style={{ background: "transparent" }}
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--panel-w')) || 280;
          const onMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = Math.max(200, Math.min(startWidth + startX - moveEvent.clientX, 600));
            document.documentElement.style.setProperty('--panel-w', `${newWidth}px`);
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
      {/* Panel Header */}
      <div
        className="px-3 py-2.5 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex flex-col gap-0.5">
          <span
            className="font-medium text-xs"
            style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--color-text-1)" }}
          >
            Table Relationship
          </span>
          <span className="text-[10px] font-mono" style={{ color: "var(--color-text-3)" }}>
            {selectedEdge.source.includes(".") ? selectedEdge.source.split(".").pop() : selectedEdge.source}
            {" → "}
            {selectedEdge.target.includes(".") ? selectedEdge.target.split(".").pop() : selectedEdge.target}
          </span>
        </div>
        <span className="section-label" style={{ color: "var(--color-amber)", fontSize: 9 }}>
          {((data.relations as any[]) || []).length} MAPPING{((data.relations as any[]) || []).length !== 1 ? "S" : ""}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-2 p-3 pb-4">
          <span className="section-label flex justify-between items-center" style={{ fontSize: 9, color: "var(--color-text-3)" }}>
            <span>COLUMNS MAPPING</span>
            <span className="flex items-center gap-1">
              <button
                onClick={() => {
                  const sourceNode = getNode(selectedEdge.source);
                  const targetNode = getNode(selectedEdge.target);
                  if (!sourceNode || !targetNode) return;

                  const sourceCols: { name: string }[] = (sourceNode.data as any).columns || [];
                  const targetCols: { name: string }[] = (targetNode.data as any).columns || [];
                  const existingRelations = (data.relations as any[]) || [];

                  // Find matching column names (case-insensitive)
                  const newRelations = [...existingRelations];
                  let addedCount = 0;
                  for (const sc of sourceCols) {
                    const match = targetCols.find(
                      (tc) => tc.name.toLowerCase() === sc.name.toLowerCase()
                    );
                    if (!match) continue;
                    // Skip if already mapped
                    const alreadyExists = newRelations.some(
                      (r) =>
                        r.sourceCol.toLowerCase() === sc.name.toLowerCase() &&
                        r.targetCol.toLowerCase() === match.name.toLowerCase()
                    );
                    if (alreadyExists) continue;
                    newRelations.push({ sourceCol: sc.name, targetCol: match.name });
                    addedCount++;
                  }

                  if (addedCount > 0) {
                    updateEdgeData("relations", newRelations);
                  }
                }}
                title="Auto-match columns with the same name"
                className="px-1.5 py-0.5 rounded-sm font-semibold transition-all duration-150"
                style={{
                  background: "rgba(78, 158, 255, 0.1)",
                  color: "#4E9EFF",
                  border: "1px solid rgba(78, 158, 255, 0.2)",
                  fontSize: 9,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(78, 158, 255, 0.2)";
                  e.currentTarget.style.borderColor = "rgba(78, 158, 255, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(78, 158, 255, 0.1)";
                  e.currentTarget.style.borderColor = "rgba(78, 158, 255, 0.2)";
                }}
              >
                ⚡ AUTO
              </button>
              <button
                onClick={() => {
                  const relations = (data.relations as any[]) || [];
                  updateEdgeData("relations", [...relations, { sourceCol: "", targetCol: "" }]);
                }}
                className="text-amber-500 hover:text-amber-400 font-bold px-1"
              >
                + ADD
              </button>
            </span>
          </span>
          <div className="flex flex-col gap-2">
            {((data.relations as any[]) || []).map((rel, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center gap-1.5 p-2 rounded-sm relative group/rel"
                style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-mid)" }}
              >
                <button
                  onClick={() => {
                    const newRels = [...(data.relations as any[])];
                    newRels.splice(idx, 1);
                    if (newRels.length === 0) {
                      captureHistory();
                      setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
                      setSelectedEdgeId(null);
                      setIsDirty(true);
                    } else {
                      updateEdgeData("relations", newRels);
                    }
                  }}
                  className="absolute -right-2 -top-2 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover/rel:opacity-100 transition-opacity"
                >
                  ×
                </button>
                <ColumnEndpoint
                  tableId={selectedEdge.source}
                  column={rel.sourceCol || ""}
                  onChange={(val) => {
                    const newRels = [...(data.relations as any[])];
                    newRels[idx] = { ...newRels[idx], sourceCol: val };
                    updateEdgeData("relations", newRels);
                  }}
                />
                <div className="text-center" style={{ color: "var(--color-text-3)", fontSize: 12, marginTop: -4, marginBottom: -4 }}>
                  ↕
                </div>
                <ColumnEndpoint
                  tableId={selectedEdge.target}
                  column={rel.targetCol || ""}
                  onChange={(val) => {
                    const newRels = [...(data.relations as any[])];
                    newRels[idx] = { ...newRels[idx], targetCol: val };
                    updateEdgeData("relations", newRels);
                  }}
                />
              </div>
            ))}
            {((data.relations as any[]) || []).length === 0 && (
              <div className="text-center py-4 text-xs text-gray-500 italic">No relations mapped. Add one to connect these tables.</div>
            )}
          </div>
        </div>
        <PropertyInput
          label="DESCRIPTION"
          value={data.description || ""}
          onChange={(v) => updateEdgeData("description", v)}
          type="textarea"
        />
      </div>

      {/* Footer actions */}
      <div
        className="px-3 py-2 flex gap-2 shrink-0"
        style={{ borderTop: "1px solid var(--color-border)" }}
      >
        <button
          onClick={() => {
            captureHistory();
            setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
            setSelectedEdgeId(null);
            setIsDirty(true);
          }}
          className="flex-1 py-1.5 rounded-sm text-xs font-medium transition-all duration-100"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "rgba(239,68,68,0.7)",
            fontFamily: "Space Grotesk, sans-serif",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.18)";
            (e.currentTarget as HTMLButtonElement).style.color = "#EF4444";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(239,68,68,0.7)";
          }}
        >
          Delete Edge
        </button>
      </div>
    </aside>
  );
}
