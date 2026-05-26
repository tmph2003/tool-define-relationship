import React, { useState } from "react";
import { type Edge, type Node } from "@xyflow/react";
import type { TableNodeData } from "../components/TableNode";
import { useProject } from "../store/ProjectContext";

interface RelationsViewProps {
  nodes: Node[];
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  captureHistory: () => void;
}

export default function RelationsView({ nodes, edges, setEdges, captureHistory }: RelationsViewProps) {
  const { setIsDirty } = useProject();

  // State for creating new relationships
  const [fromTable, setFromTable] = useState<string>("");
  const [fromColumn, setFromColumn] = useState<string>("");
  const [toTable, setToTable] = useState<string>("");
  const [toColumn, setToColumn] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState<boolean>(true);
  
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
    console.log("isDirty triggered by RelationsView updateEdge");
    setIsDirty(true);
  };

  const deleteEdge = (edgeId: string) => {
    captureHistory();
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    console.log("isDirty triggered by RelationsView deleteEdge");
    setIsDirty(true);
  };

  const handleAddRelationship = () => {
    if (!fromTable || !toTable || !fromColumn || !toColumn) return;

    captureHistory();

    const isSourceFirst = fromTable < toTable;
    const sourceId = isSourceFirst ? fromTable : toTable;
    const targetId = isSourceFirst ? toTable : fromTable;
    const sourceCol = isSourceFirst ? fromColumn : toColumn;
    const targetCol = isSourceFirst ? toColumn : fromColumn;

    const edgeId = `edge-${sourceId}-${targetId}`;

    setEdges((currentEdges) => {
      const existingEdgeIndex = currentEdges.findIndex((e) => e.id === edgeId);

      if (existingEdgeIndex > -1) {
        const existingEdge = currentEdges[existingEdgeIndex];
        const relations = (existingEdge.data?.relations as any[]) || [];
        
        const relationExists = relations.some(
          (r) => r.sourceCol === sourceCol && r.targetCol === targetCol
        );

        if (relationExists) {
          return currentEdges;
        }

        const updatedRelations = [...relations, { sourceCol, targetCol }];
        const updatedEdge = {
          ...existingEdge,
          data: {
            ...existingEdge.data,
            relations: updatedRelations
          }
        };

        const newEdges = [...currentEdges];
        newEdges[existingEdgeIndex] = updatedEdge;
        return newEdges;
      } else {
        const newEdge: Edge = {
          id: edgeId,
          source: sourceId,
          target: targetId,
          sourceHandle: "table-source",
          targetHandle: "table-target",
          type: "relationshipEdge",
          animated: false,
          selected: false,
          style: { stroke: "var(--color-amber)", strokeWidth: 1.5 },
          data: {
            relations: [{ sourceCol, targetCol }]
          }
        };

        return [...currentEdges, newEdge];
      }
    });

    setIsDirty(true);
    
    // Reset columns, keep tables for speed
    setFromColumn("");
    setToColumn("");
  };

  return (
    <div
      className="absolute inset-0 z-10 p-8 overflow-y-auto"
      style={{
        background: "var(--color-bg)",
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              Relations Manager
            </h2>
            <p className="text-sm text-gray-400">
              Manage and customize all data relationships in the current graph.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="px-4 py-2 text-xs font-semibold rounded-md border border-[var(--color-border-mid)] hover:bg-white/5 transition-all text-white flex items-center gap-1.5"
            >
              {isFormOpen ? "Hide Designer" : "Show Designer"}
            </button>
            <div className="px-4 py-2 rounded-md bg-amber-500/10 text-amber-500 font-mono text-sm border border-amber-500/20">
              {edges.length} {edges.length === 1 ? "Relation" : "Relations"}
            </div>
          </div>
        </div>

        {/* Collapsible Power BI Style Relationship Designer */}
        {isFormOpen && (
          <div className="mb-8 p-6 rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/[0.03] via-amber-500/[0.01] to-transparent backdrop-blur-md shadow-xl relative overflow-hidden transition-all duration-300 hover:border-amber-500/30 animate-fadeIn">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.02] rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-2 mb-6">
              <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-space">
                Add Relationship
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-9 gap-4 items-start">
              {/* FROM Table Block */}
              <div className="md:col-span-4 space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Source Table (From)
                  </label>
                  <select
                    value={fromTable}
                    onChange={(e) => {
                      setFromTable(e.target.value);
                      setFromColumn("");
                    }}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border-mid)] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
                  >
                    <option value="">Select source table...</option>
                    {nodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {getTableName(node.id)}
                      </option>
                    ))}
                  </select>
                </div>

                {fromTable && (
                  <div className="animate-fadeIn">
                    <label className="block text-[10px] font-bold text-amber-500/80 uppercase tracking-widest mb-1.5">
                      Source Column
                    </label>
                    <select
                      value={fromColumn}
                      onChange={(e) => setFromColumn(e.target.value)}
                      className="w-full bg-[var(--color-bg)] border border-amber-500/30 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
                    >
                      <option value="">Select source column...</option>
                      {getColumns(fromTable).map((col) => (
                        <option key={col.name} value={col.name}>
                          {col.name} ({col.type})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Arrow Connector */}
              <div className="md:col-span-1 flex flex-col items-center justify-center self-center py-2">
                <div className="p-2 rounded-full bg-white/5 border border-white/10 text-gray-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>

              {/* TO Table Block */}
              <div className="md:col-span-4 space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Target Table (To)
                  </label>
                  <select
                    value={toTable}
                    onChange={(e) => {
                      setToTable(e.target.value);
                      setToColumn("");
                    }}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border-mid)] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
                  >
                    <option value="">Select target table...</option>
                    {nodes
                      .filter((n) => n.id !== fromTable)
                      .map((node) => (
                        <option key={node.id} value={node.id}>
                          {getTableName(node.id)}
                        </option>
                      ))}
                  </select>
                </div>

                {toTable && (
                  <div className="animate-fadeIn">
                    <label className="block text-[10px] font-bold text-amber-500/80 uppercase tracking-widest mb-1.5">
                      Target Column
                    </label>
                    <select
                      value={toColumn}
                      onChange={(e) => setToColumn(e.target.value)}
                      className="w-full bg-[var(--color-bg)] border border-amber-500/30 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
                    >
                      <option value="">Select target column...</option>
                      {getColumns(toTable).map((col) => (
                        <option key={col.name} value={col.name}>
                          {col.name} ({col.type})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Validation & Action Button */}
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between gap-4 flex-wrap">
              <div className="text-xs text-gray-400 font-mono">
                {fromTable && toTable && fromColumn && toColumn ? (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Valid relationship: {getTableName(fromTable)}.{fromColumn} &rarr; {getTableName(toTable)}.{toColumn}
                  </span>
                ) : (
                  "Select tables and matching fields to connect."
                )}
              </div>
              <button
                onClick={handleAddRelationship}
                disabled={!fromTable || !toTable || !fromColumn || !toColumn}
                className={`px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                  fromTable && toTable && fromColumn && toColumn
                    ? "bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/10 cursor-pointer active:scale-95"
                    : "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
                }`}
              >
                Establish Relationship
              </button>
            </div>
          </div>
        )}

        {/* Existing Relations Table */}
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
