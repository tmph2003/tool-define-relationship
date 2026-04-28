/**
 * CenterCanvas — React Flow–powered relationship canvas.
 *
 * Features:
 * - Draggable table nodes with per-column handles
 * - Column-to-column edge connections
 * - Zoom, pan, minimap, controls
 * - Edges saved in state (useEdgesState)
 * - Obsidian Cartographer dark theme
 */
import { useCallback, useMemo, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useStoreApi,
  ConnectionMode,
  ConnectionLineType,
  type Connection,
  type Edge,
  type Node,
  type EdgeMouseHandler,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import TableNode, { type TableNodeData } from "../components/TableNode";
import SuggestedEdge from "../components/SuggestedEdge";
import RelationshipEdge from "../components/RelationshipEdge";
import { useToast } from "../contexts/ToastContext";
import { getLayoutedElements } from "../utils/layout";
import { useMetadata } from "../store/MetadataContext";
import { useProject } from "../store/ProjectContext";
import { fetchProjectState } from "../api/projects";
import RelationsView from "./RelationsView";
import { fetchColumns } from "../services";
import { columnGroupsToEdges } from "../utils/edgeConversion";

// ─── Node & Edge type registry ───────────────────────────────────────────────

const nodeTypes = { tableNode: TableNode };
const edgeTypes = { suggestedEdge: SuggestedEdge, relationshipEdge: RelationshipEdge };

// ─── Sample data — 4 tables with realistic columns ───────────────────────────

const INITIAL_NODES: Node[] = [];

const INITIAL_EDGES: Edge[] = [];

// Helper to calculate the ideal initial height for a table node
// Shows up to 10 columns. If fewer than 10, shows exactly that many.
function calcNodeHeight(numCols: number): number {
  const ROW_HEIGHT = 26;
  const HEADER_HEIGHT = 36;
  const PADDING_BOTTOM = 8;
  const visibleCols = Math.min(10, Math.max(1, numCols)); // at least 1 row space
  return HEADER_HEIGHT + visibleCols * ROW_HEIGHT + PADDING_BOTTOM;
}

// ─── Canvas component ─────────────────────────────────────────────────────────

export default function CenterCanvas() {
  const { toast } = useToast();
  const { state: metadataState, toggleTable } = useMetadata();
  const { screenToFlowPosition, fitView } = useReactFlow();
  const store = useStoreApi();
  const [nodes, setNodes, onNodesChangeCore] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChangeCore] = useEdgesState(INITIAL_EDGES);

  const { captureHistory, undoHistory, activeTab, setSelectedEdgeId, setSelectedNodeId, setIsDirty, setServerVersion, setIsProjectLoading } = useProject();

  // Cancel connection on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        store.getState().cancelConnection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store]);

  // Guard to prevent save from overwriting data while load is in progress
  const isLoadingRef = useRef(false);
  // Guard to prevent undo from re-triggering isDirty via onNodesChange/onEdgesChange
  const isUndoingRef = useRef(false);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChangeCore(changes);
    if (!isLoadingRef.current && !isUndoingRef.current) {
      if (changes.some(c => c.type === 'remove' || c.type === 'add')) {
        console.log("isDirty triggered by onNodesChange:", changes.filter(c => c.type === 'remove' || c.type === 'add'));
        setIsDirty(true);
      }
    }
  }, [onNodesChangeCore, setIsDirty]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChangeCore(changes);
    if (!isLoadingRef.current && !isUndoingRef.current) {
      if (changes.some(c => c.type === 'remove' || c.type === 'add')) {
        console.log("isDirty triggered by onEdgesChange:", changes.filter(c => c.type === 'remove' || c.type === 'add'));
        setIsDirty(true);
      }
    }
  }, [onEdgesChangeCore, setIsDirty]);

  // Force pointer-events on the edges containers — React Flow v12 sets
  // pointer-events:none on multiple layers which blocks edge click events.
  useEffect(() => {
    const container = document.getElementById("relationship-canvas");
    if (!container) return;

    const fix = () => {
      // Fix the .react-flow__edges div
      container.querySelectorAll<HTMLElement>(".react-flow__edges").forEach((el) => {
        if (el.style.pointerEvents !== "all") el.style.pointerEvents = "all";
      });
      // Fix all SVG elements inside .react-flow__edges
      container.querySelectorAll<SVGElement>(".react-flow__edges svg").forEach((el) => {
        if (el.style.pointerEvents !== "all") el.style.pointerEvents = "all";
      });
      // Fix each edge <g> element
      container.querySelectorAll<SVGGElement>(".react-flow__edge").forEach((el) => {
        if (el.style.pointerEvents !== "all") el.style.pointerEvents = "all";
      });
    };

    // Fix on mount + observe for React Flow re-renders
    fix();
    const observer = new MutationObserver(fix);
    observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, []);

  const onNodesDelete = useCallback(() => {
    captureHistory();
  }, [captureHistory]);

  const onEdgesDelete = useCallback(() => {
    captureHistory();
  }, [captureHistory]);

  // Undo & Manual Delete keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      // Undo (Ctrl+Z)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        isUndoingRef.current = true;
        const success = undoHistory();
        // Clear the flag after React Flow processes the state changes
        setTimeout(() => { isUndoingRef.current = false; }, 200);
        if (success) {
          toast({ type: "success", message: "Undo successful" });
        } else {
          toast({ type: "info", message: "Nothing to undo" });
        }
        return;
      }

      // Manual Delete (only the actual 'Delete' key, to avoid TELEX IME Backspace events on 'A A' or 'D D')
      if (e.key === 'Delete') {
        const selectedNodes = nodes.filter(n => n.selected);
        const selectedEdges = edges.filter(e => e.selected);

        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          captureHistory();

          if (selectedNodes.length > 0) {
            const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
            setNodes(nds => nds.filter(n => !selectedNodeIds.has(n.id)));
            // Also delete connected edges
            setEdges(eds => eds.filter(e => !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target)));
          } else if (selectedEdges.length > 0) {
            const selectedEdgeIds = new Set(selectedEdges.map(e => e.id));
            setEdges(eds => eds.filter(e => !selectedEdgeIds.has(e.id)));
          }
          console.log("isDirty triggered by manual delete");
          setIsDirty(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, setNodes, setEdges, toast, captureHistory, undoHistory]);

  const storageKey = useMemo(() => {
    if (metadataState.connectedUser) {
      return `rd_graph_user_${metadataState.connectedUser}`;
    }
    return null;
  }, [metadataState.connectedUser]);

  // Load from backend on connection
  useEffect(() => {
    let mounted = true;
    if (metadataState.connectionStatus === "connected" && storageKey) {
      isLoadingRef.current = true;
      setIsProjectLoading(true);
      fetchProjectState(storageKey).then(saved => {
        if (!mounted || !saved) {
          isLoadingRef.current = false;
          setIsProjectLoading(false);
          return;
        }
        const { nodes: savedNodes, column_groups: savedGroups } = saved;

        // Restore nodes
        if (savedNodes && savedNodes.length > 0) {
          setNodes(savedNodes.map(node => {
            // Backfill catalog for legacy nodes that were saved before catalog support
            if (node.data && !node.data.catalog && metadataState.catalog) {
              node.data.catalog = metadataState.catalog;
            }
            return node;
          }));
        }

        // Restore edges from column_groups
        if (savedGroups && savedGroups.length > 0 && savedNodes) {
          const restoredEdges = columnGroupsToEdges(savedGroups, savedNodes);
          setEdges(restoredEdges);
        }

        if (saved.version !== undefined) {
          setServerVersion(saved.version);
        }
        setIsDirty(false);

        // ── Re-fetch columns from Trino to detect schema changes ───────
        // Saved nodes may have stale column data. Re-fetch from Trino and
        // update any node whose columns have changed.
        if (savedNodes && savedNodes.length > 0) {
          const refreshPromises = savedNodes
            .filter((n: any) => n.type === "tableNode" && n.data?.schema && n.data?.label && !n.data?.loading)
            .map((n: any) => {
              const schemaName = n.data.schema as string;
              const tableName = n.data.label as string;
              return fetchColumns(schemaName, tableName)
                .then((res) => ({ nodeId: n.id, columns: res.columns }))
                .catch((err) => {
                  console.warn(`Schema refresh: failed to fetch columns for ${schemaName}.${tableName}`, err);
                  return null;
                });
            });

          Promise.all(refreshPromises).then((results) => {
            if (!mounted) return;
            const validResults = results.filter((r): r is { nodeId: string; columns: any[] } => r !== null);
            if (validResults.length === 0) return;

            setNodes((nds) => {
              let anyChanged = false;
              const nextNodes = nds.map((node) => {
                const result = validResults.find((r) => r.nodeId === node.id);
                if (!result) return node;

                const freshCols = result.columns.map((c) => ({
                  name: c.column_name,
                  type: c.data_type,
                }));
                const savedCols = (node.data as any).columns || [];

                // Compare: check if columns differ (count, names, or types)
                const colsMatch =
                  savedCols.length === freshCols.length &&
                  savedCols.every((sc: any, i: number) =>
                    sc.name === freshCols[i].name && sc.type === freshCols[i].type
                  );

                if (colsMatch) return node;

                anyChanged = true;
                console.log(`Schema refresh: updating columns for ${node.id} (${savedCols.length} → ${freshCols.length} columns)`);
                return {
                  ...node,
                  style: { ...node.style, height: calcNodeHeight(freshCols.length) },
                  data: {
                    ...node.data,
                    loading: false,
                    columns: freshCols,
                  },
                };
              });

              if (anyChanged) {
                // Mark dirty so user knows the graph has schema updates to save
                setIsDirty(true);
              }
              return anyChanged ? nextNodes : nds;
            });
          });
        }

        // Allow saves after load is complete (small timeout to let state flush)
        setTimeout(() => {
          if (mounted) {
            isLoadingRef.current = false;
            setIsProjectLoading(false);
          }
        }, 100);
      });
    }
    return () => { mounted = false; };
  }, [metadataState.connectionStatus, storageKey, setNodes, setEdges, setIsProjectLoading]);

  // Auto-fetch missing columns for ANY node on the canvas that is in loading state
  const fetchingNodesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Only auto-fetch when Trino is connected
    if (metadataState.connectionStatus !== "connected") return;

    nodes.forEach((n) => {
      if (n.type === "tableNode" && (n.data as any).loading) {
        if (fetchingNodesRef.current.has(n.id)) return;
        fetchingNodesRef.current.add(n.id);

        const schemaName = n.data.schema as string;
        const tableName = n.data.label as string;

        fetchColumns(schemaName, tableName)
          .then((res) => {
            setNodes((nds) =>
              nds.map((node) => {
                if (node.id === n.id) {
                  const newCols = res.columns.map((c) => ({
                    name: c.column_name,
                    type: c.data_type,
                  }));
                  return {
                    ...node,
                    style: { ...node.style, height: calcNodeHeight(newCols.length) },
                    data: {
                      ...node.data,
                      loading: false,
                      columns: newCols,
                    },
                  };
                }
                return node;
              })
            );
          })
          .catch((err) => console.error(`Failed to auto-load columns for ${schemaName}.${tableName}`, err))
          .finally(() => {
            fetchingNodesRef.current.delete(n.id);
          });
      }
    });
  }, [nodes, setNodes, metadataState.connectionStatus]);

  // Sync loaded columns into nodes that are in "loading" state
  useEffect(() => {
    setNodes((nds) => {
      let changed = false;
      const nextNodes = nds.map((n) => {
        if (n.type === "tableNode" && (n.data as any).loading) {
          const schema = metadataState.schemas.find((s) => s.schema_name === n.data.schema);
          const table = schema?.tables?.find((t) => t.table_name === n.data.label);
          if (table && table.columns && table.columns.length > 0) {
            changed = true;
            const newCols = table.columns.map((c) => ({
              name: c.column_name,
              type: c.data_type,
            }));
            return {
              ...n,
              style: { ...n.style, height: calcNodeHeight(newCols.length) },
              data: {
                ...n.data,
                loading: false,
                columns: newCols,
              },
            };
          }
        }
        return n;
      });
      return changed ? nextNodes : nds;
    });
  }, [metadataState.schemas, setNodes]);

  // Validate edges: remove relations that refer to non-existent columns (e.g. after DB refresh)
  useEffect(() => {
    if (nodes.length === 0 || edges.length === 0) return;

    setEdges((eds) => {
      let changed = false;
      const nextEdges = eds.map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        if (!sourceNode || !targetNode) return edge;
        // Skip validation if nodes are still loading columns
        if ((sourceNode.data as any).loading || (targetNode.data as any).loading) return edge;

        const sourceCols = new Set(((sourceNode.data as any).columns || []).map((c: any) => c.name));
        const targetCols = new Set(((targetNode.data as any).columns || []).map((c: any) => c.name));

        const relations = (edge.data?.relations as any[]) || [];
        const validRelations = relations.filter(r => sourceCols.has(r.sourceCol) && targetCols.has(r.targetCol));

        if (validRelations.length !== relations.length) {
          changed = true;
          return {
            ...edge,
            data: { ...edge.data, relations: validRelations }
          };
        }
        return edge;
      }).filter(edge => {
        const rels = edge.data?.relations as any[] | undefined;
        // If an edge was modified and now has 0 relations, remove the entire edge
        if (rels && rels.length === 0) {
          changed = true;
          return false;
        }
        return true;
      });

      if (changed) {
        console.log("isDirty triggered by edge validation (relations length mismatch or 0)");
        setIsDirty(true);
        return nextEdges;
      }
      return eds;
    });
  }, [nodes, setEdges, setIsDirty]);

  // When a user draws a new edge between column handles
  const onConnect = useCallback(
    (connection: Connection) => {
      // Prevent self-referencing (same table)
      if (connection.source === connection.target) {
        toast({ type: "warning", message: "Cannot create relationship within the same table." });
        return;
      }

      const sourceCol = connection.sourceHandle?.replace(/^col-/, "").replace(/-(source|target)$/, "") || "";
      const targetCol = connection.targetHandle?.replace(/^col-/, "").replace(/-(source|target)$/, "") || "";

      const existingEdge = edges.find(
        (e) => (e.source === connection.source && e.target === connection.target) ||
          (e.source === connection.target && e.target === connection.source)
      );

      if (existingEdge) {
        const isReversed = existingEdge.source === connection.target;
        const newRelation = isReversed
          ? { sourceCol: targetCol, targetCol: sourceCol }
          : { sourceCol, targetCol };

        const relations = (existingEdge.data?.relations as any[]) || [];
        const isDuplicate = relations.some(
          (r) => r.sourceCol === newRelation.sourceCol && r.targetCol === newRelation.targetCol
        );

        if (isDuplicate) {
          toast({ type: "warning", message: "Relationship already exists between these columns." });
          return;
        }

        captureHistory();
        setEdges((eds) => eds.map((e) => {
          if (e.id === existingEdge.id) {
            console.log("isDirty triggered by onConnect (existing edge modification)");
            setIsDirty(true);
            return {
              ...e,
              data: {
                ...e.data,
                relations: [...((e.data?.relations as any[]) || []), newRelation]
              }
            };
          }
          return e;
        }));
      } else {
        captureHistory();
        const edgeId = `edge-${connection.source}-${connection.target}`;
        const newEdge: Edge = {
          id: edgeId,
          source: connection.source,
          target: connection.target,
          sourceHandle: "table-source",
          targetHandle: "table-target",
          type: "relationshipEdge",
          animated: false,
          selected: true,
          style: { stroke: "var(--color-amber)", strokeWidth: 1.5 },
          data: {
            relations: [{ sourceCol, targetCol }]
          },
        };
        console.log("isDirty triggered by onConnect (new edge)");
        setIsDirty(true);
        setEdges((eds) => addEdge(newEdge, eds));
      }
    },
    [edges, setEdges, toast, captureHistory, setIsDirty]
  );

  // Explicitly handle edge clicks for selection via shared context
  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      setSelectedEdgeId(edge.id);
      setSelectedNodeId(null);
    },
    [setSelectedEdgeId, setSelectedNodeId]
  );

  // Handle node clicks for selection via shared context
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);
    },
    [setSelectedNodeId, setSelectedEdgeId]
  );

  // Handle pane click to deselect all
  const onPaneClick = useCallback(() => {
    setSelectedEdgeId(null);
    setSelectedNodeId(null);
  }, [setSelectedEdgeId, setSelectedNodeId]);

  const onAutoLayout = useCallback(() => {
    captureHistory();

    // Auto-resize nodes before layouting so they don't overlap
    const resizedNodes = nodes.map(node => {
      const data = node.data as any;
      if (!data || !data.label) return node;

      const numCols = data.columns?.length || 0;
      const calcHeight = calcNodeHeight(numCols);

      let maxColLen = 0;
      if (data.columns && data.columns.length > 0) {
        maxColLen = Math.max(...data.columns.map((c: any) => (c.name?.length || 0) + (c.type?.length || 0)));
      }
      const estimatedWidth = Math.max(260, (data.label.length || 0) * 9 + 100, maxColLen * 8 + 70);

      return {
        ...node,
        style: { ...node.style, width: estimatedWidth, height: calcHeight },
        measured: undefined // Clear cached measurement so layout uses the new style dimensions
      };
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(resizedNodes as Node[], edges);
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
    window.requestAnimationFrame(() => {
      fitView({ padding: 0.3, duration: 800 });
    });

    console.log("isDirty triggered by onAutoLayout");
    setIsDirty(true);
  }, [nodes, edges, setNodes, setEdges, fitView, captureHistory, setIsDirty]);

  // Default edge styling
  const defaultEdgeOptions = useMemo(
    () => ({
      style: { strokeWidth: 1.5 },
      type: "smoothstep" as const,
    }),
    []
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = document.getElementById("relationship-canvas")?.getBoundingClientRect();
      const rawData = event.dataTransfer.getData("application/rd-table");
      if (!rawData || !reactFlowBounds) return;

      try {
        const data = JSON.parse(rawData);

        // Find the columns from the metadata state
        const schema = metadataState.schemas.find(s => s.schema_name === data.schema);
        const table = schema?.tables?.find(t => t.table_name === data.table);

        const hasColumns = table && table.columns && table.columns.length > 0;

        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        // Determine an accent color based on table name length
        const accentColors = ["#F5A623", "#4E9EFF", "#A78BFA", "#34D399", "#F472B6", "#60A5FA"];
        const color = accentColors[data.table.length % accentColors.length];

        const numCols = table?.columns?.length || 0;
        const calcHeight = calcNodeHeight(numCols);

        // Estimate width based on table name length and max column length to avoid truncation
        let maxColLen = 0;
        if (table?.columns && table.columns.length > 0) {
          maxColLen = Math.max(...table.columns.map(c => (c.column_name?.length || 0) + (c.data_type?.length || 0)));
        }
        const estimatedWidth = Math.max(260, data.table.length * 9 + 100, maxColLen * 8 + 70);

        const newNode: Node = {
          id: `${data.schema}.${data.table}`,
          type: "tableNode",
          dragHandle: ".table-node-header",
          position,
          style: { width: estimatedWidth, height: calcHeight },
          data: {
            label: data.table,
            schema: data.schema,
            catalog: data.catalog,
            accent: color,
            loading: !hasColumns,
            columns: (table && table.columns) ? table.columns.map(c => ({
              name: c.column_name,
              type: c.data_type,
              isPk: c.column_name.toLowerCase() === 'id' || c.column_name.toLowerCase() === `${data.table.toLowerCase()}_id`,
              isFk: c.column_name.toLowerCase().endsWith('_id') && c.column_name.toLowerCase() !== 'id' && c.column_name.toLowerCase() !== `${data.table.toLowerCase()}_id`,
            })) : []
          } satisfies TableNodeData,
        };

        captureHistory();

        setNodes((nds) => {
          if (nds.some(n => n.id === newNode.id)) {
            toast({ type: "info", message: `${data.table} is already on the canvas.` });
            return nds;
          }
          return [...nds, newNode];
        });

        console.log("isDirty triggered by onDrop");
        setIsDirty(true);

        // If columns are not loaded yet, trigger the API fetch
        if (!hasColumns) {
          toggleTable(data.schema, data.table).catch(err => {
            console.error("Failed to fetch table columns on drop", err);
            toast({ type: "error", message: `Failed to load columns for ${data.table}` });
            // Optional: we could remove the loading node here, but letting it stay is fine
          });
        }
      } catch (err) {
        console.error("Drop error", err);
      }
    },
    [screenToFlowPosition, metadataState.schemas, setNodes, toast, toggleTable, captureHistory]
  );

  return (
    <main
      id="relationship-canvas"
      className="fixed overflow-hidden transition-all duration-300"
      style={{
        top: "var(--nav-h)",
        left: activeTab === "Relations" ? 0 : "var(--sidebar-w)",
        right: activeTab === "Relations" ? 0 : "var(--panel-w)",
        bottom: 0,
        background: "var(--color-bg)",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        deleteKeyCode={null}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={60}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: "var(--color-amber)", strokeWidth: 1.5, strokeDasharray: "5 3" }}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.15}
        maxZoom={3}
        snapToGrid
        snapGrid={[12, 12]}
        colorMode="dark"
        elevateEdgesOnSelect
        proOptions={{ hideAttribution: true }}
      >
        <Panel position="top-right" className="m-4">
          <button
            onClick={onAutoLayout}
            className="flex items-center gap-2 px-3 py-2 bg-surface-2 border border-border-mid rounded-sm shadow-lg hover:border-amber transition-colors text-xs font-medium text-text-1"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          >
            <span style={{ color: "var(--color-amber)", fontSize: 14 }}>⎘</span>
            Auto Layout
          </button>
        </Panel>

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 opacity-60">
            <span className="text-4xl mb-4 text-text-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>⬡</span>
            <p className="text-xs text-text-3 font-mono text-center">
              Drag tables from the metadata explorer
              <br />
              to begin mapping relationships
            </p>
          </div>
        )}

        {/* Dot background */}
        <Background
          variant={"dots" as any}
          gap={24}
          size={1}
          color="rgba(255,255,255,0.06)"
        />

        {/* Zoom / fit controls */}
        <Controls
          position="bottom-right"
          showInteractive={false}
          style={{
            borderRadius: 4,
            overflow: "hidden",
          }}
        />

        {/* Minimap in bottom-left */}
        <MiniMap
          position="bottom-left"
          nodeColor={(n: Node) => {
            const d = n.data as unknown as TableNodeData;
            return d.accent ?? "#F5A623";
          }}
          maskColor="rgba(12,13,15,0.8)"
          style={{
            background: "var(--color-surface)",
            borderRadius: 4,
            border: "1px solid var(--color-border-mid)",
          }}
          pannable
          zoomable
        />
      </ReactFlow>

      {activeTab === "Relations" && (
        <RelationsView
          nodes={nodes}
          edges={edges}
          setEdges={setEdges}
          captureHistory={captureHistory}
        />
      )}
    </main>
  );
}
