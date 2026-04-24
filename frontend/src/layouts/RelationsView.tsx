import React from "react";
import { type Edge, type Node } from "@xyflow/react";
import type { TableNodeData } from "../components/TableNode";

interface RelationsViewProps {
  nodes: Node[];
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  captureHistory: () => void;
}

export default function RelationsView({ nodes, edges, setEdges, captureHistory }: RelationsViewProps) {
  
  const getColumns = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return [];
    return (node.data as unknown as TableNodeData).columns || [];
  };

  const getTableName = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return nodeId;
    return (node.data as unknown as TableNodeData).label || nodeId;
  };

  const updateEdge = (edgeId: string, updates: Partial<Edge>) => {
    captureHistory();
    setEdges((eds) => eds.map((e) => (e.id === edgeId ? { ...e, ...updates } : e)));
  };

  const deleteEdge = (edgeId: string) => {
    captureHistory();
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
  };

  return (
    <div
      className="absolute inset-0 z-10 p-8 overflow-y-auto"
      style={{
        background: "var(--color-bg)",
      }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              Relations Manager
            </h2>
            <p className="text-sm text-gray-400">
              Manage and customize all data relationships in the current graph.
            </p>
          </div>
          <div className="px-4 py-2 rounded-md bg-amber-500/10 text-amber-500 font-mono text-sm border border-amber-500/20">
            {edges.length} {edges.length === 1 ? "Relation" : "Relations"}
          </div>
        </div>

        <div className="rounded-lg overflow-hidden border border-[var(--color-border-mid)] bg-[var(--color-surface)] shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border-mid)] text-[var(--color-text-3)] text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Source Table</th>
                <th className="px-6 py-4">Source Column</th>
                <th className="px-6 py-4"></th>
                <th className="px-6 py-4">Target Table</th>
                <th className="px-6 py-4">Target Column</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-mid)] text-sm">
              {edges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--color-text-3)]">
                    No relations defined in the graph yet.
                  </td>
                </tr>
              ) : (
                edges.flatMap((edge) => {
                  const sourceCols = getColumns(edge.source);
                  const targetCols = getColumns(edge.target);
                  const relations = (edge.data?.relations as any[]) || [];

                  return relations.map((rel, idx) => (
                    <tr key={`${edge.id}-${idx}`} className="hover:bg-white/[0.02] transition-colors border-t border-[var(--color-border-mid)]">
                      {/* Source Table */}
                      <td className="px-6 py-4 font-mono text-[var(--color-text-1)] whitespace-nowrap">
                        {idx === 0 ? getTableName(edge.source) : ""}
                      </td>

                      {/* Source Column Dropdown */}
                      <td className="px-6 py-4">
                        <select
                          className="w-full bg-[var(--color-bg)] border border-[var(--color-border-mid)] rounded px-3 py-1.5 text-[var(--color-text-1)] font-mono text-xs focus:outline-none focus:border-[var(--color-amber)]"
                          value={rel.sourceCol || ""}
                          onChange={(e) => {
                            const newRels = [...relations];
                            newRels[idx] = { ...newRels[idx], sourceCol: e.target.value };
                            updateEdge(edge.id, { data: { ...edge.data, relations: newRels } });
                          }}
                        >
                          <option value="" disabled>Select column...</option>
                          {sourceCols.map((col) => (
                            <option key={col.name} value={col.name}>
                              {col.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Arrow Icon */}
                      <td className="px-6 py-4 text-[var(--color-text-3)] text-center">
                        <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </td>

                      {/* Target Table */}
                      <td className="px-6 py-4 font-mono text-[var(--color-text-1)] whitespace-nowrap">
                        {idx === 0 ? getTableName(edge.target) : ""}
                      </td>

                      {/* Target Column Dropdown */}
                      <td className="px-6 py-4">
                        <select
                          className="w-full bg-[var(--color-bg)] border border-[var(--color-border-mid)] rounded px-3 py-1.5 text-[var(--color-text-1)] font-mono text-xs focus:outline-none focus:border-[var(--color-amber)]"
                          value={rel.targetCol || ""}
                          onChange={(e) => {
                            const newRels = [...relations];
                            newRels[idx] = { ...newRels[idx], targetCol: e.target.value };
                            updateEdge(edge.id, { data: { ...edge.data, relations: newRels } });
                          }}
                        >
                          <option value="" disabled>Select column...</option>
                          {targetCols.map((col) => (
                            <option key={col.name} value={col.name}>
                              {col.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            const newRels = [...relations];
                            newRels.splice(idx, 1);
                            if (newRels.length === 0) {
                              deleteEdge(edge.id);
                            } else {
                              updateEdge(edge.id, { data: { ...edge.data, relations: newRels } });
                            }
                          }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10 px-3 py-1.5 rounded transition-colors text-xs font-semibold"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ));
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
