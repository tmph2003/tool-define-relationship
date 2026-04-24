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
  ConnectionMode,
  ConnectionLineType,
  type Connection,
  type Edge,
  type Node,
  type EdgeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import TableNode, { type TableNodeData } from "../components/TableNode";
import SuggestedEdge from "../components/SuggestedEdge";
import RelationshipEdge from "../components/RelationshipEdge";
import { useToast } from "../contexts/ToastContext";
import { getLayoutedElements } from "../utils/layout";
import { useMetadata } from "../store/MetadataContext";
import { useProject } from "../store/ProjectContext";
import { fetchProjectState, saveProjectState } from "../api/projects";
import RelationsView from "./RelationsView";
import { fetchColumns } from "../services";
import { edgesToColumnGroups, columnGroupsToEdges } from "../utils/edgeConversion";

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
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);

  const { captureHistory, undoHistory, activeTab, setSelectedEdgeId, setSelectedNodeId } = useProject();

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
        const success = undoHistory();
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
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, setNodes, setEdges, toast, captureHistory, undoHistory]);

  const storageKey = useMemo(() => {
    if (metadataState.connectedHost && metadataState.catalog) {
      return `rd_graph_${metadataState.connectedHost}_${metadataState.catalog}_${metadataState.primarySchema || "all"}`;
    }
    return null;
  }, [metadataState.connectedHost, metadataState.catalog, metadataState.primarySchema]);

  // Guard to prevent save from overwriting data while load is in progress
  const isLoadingRef = useRef(false);

  // Load from backend on connection
  useEffect(() => {
    let mounted = true;
    if (metadataState.connectionStatus === "connected" && storageKey) {
      isLoadingRef.current = true;
      fetchProjectState(storageKey).then(saved => {
        if (!mounted || !saved) {
          isLoadingRef.current = false;
          return;
        }
        const { nodes: savedNodes, column_groups: savedGroups } = saved;

        // Restore nodes
        if (savedNodes && savedNodes.length > 0) setNodes(savedNodes);

        // Restore edges from column_groups
        if (savedGroups && savedGroups.length > 0 && savedNodes) {
          const restoredEdges = columnGroupsToEdges(savedGroups, savedNodes);
          setEdges(restoredEdges);
        }

        // Allow saves after load is complete
        isLoadingRef.current = false;
      });
    }
    return () => { mounted = false; };
  }, [metadataState.connectionStatus, storageKey, setNodes, setEdges]);

  // Save to backend on change — uses portable column_groups format
  useEffect(() => {
    // Skip saving while load is in progress (prevents race condition)
    if (isLoadingRef.current) return;
    if (metadataState.connectionStatus === "connected" && storageKey) {
      if (nodes.length > 0 || edges.length > 0) {
        const columnGroups = edgesToColumnGroups(edges, nodes, metadataState.catalog || undefined);
        saveProjectState(storageKey, { nodes, column_groups: columnGroups });
      }
    }
  }, [nodes, edges, metadataState.connectionStatus, storageKey]);

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
                    isPk:
                      c.column_name.toLowerCase() === "id" ||
                      c.column_name.toLowerCase() === `${tableName.toLowerCase()}_id`,
                    isFk:
                      c.column_name.toLowerCase().endsWith("_id") &&
                      c.column_name.toLowerCase() !== "id" &&
                      c.column_name.toLowerCase() !== `${tableName.toLowerCase()}_id`,
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
                  isPk:
                    c.column_name.toLowerCase() === "id" ||
                    c.column_name.toLowerCase() === `${table.table_name.toLowerCase()}_id`,
                  isFk:
                    c.column_name.toLowerCase().endsWith("_id") &&
                    c.column_name.toLowerCase() !== "id" &&
                    c.column_name.toLowerCase() !== `${table.table_name.toLowerCase()}_id`,
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
        setEdges((eds) => addEdge(newEdge, eds));
      }
    },
    [edges, setEdges, toast, captureHistory]
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
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
    window.requestAnimationFrame(() => {
      fitView({ padding: 0.3, duration: 800 });
    });
  }, [nodes, edges, setNodes, setEdges, fitView, captureHistory]);

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

        const newNode: Node = {
          id: `${data.schema}.${data.table}`,
          type: "tableNode",
          dragHandle: ".table-node-header",
          position,
          style: { width: 240, height: calcHeight },
          data: {
            label: data.table,
            schema: data.schema,
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
