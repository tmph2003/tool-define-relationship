/**
 * Utility functions to convert between React Flow edges and the
 * portable column-groups format:
 *
 *   [
 *     [ { catalog: "hive", schema: "default", table: "orders", column: "customer_id" },
 *       { catalog: "hive", schema: "default", table: "customers", column: "id" } ],
 *     …
 *   ]
 */
import type { Edge, Node } from "@xyflow/react";

export interface ColumnEndpoint {
  catalog?: string;
  schema?: string;
  table: string;
  column: string;
}

// ── React Flow edges → column groups ──────────────────────────────────────────

export function edgesToColumnGroups(
  edges: Edge[],
  nodes: Node[],
  defaultCatalog?: string
): ColumnEndpoint[][] {
  const nodeMap = new Map<string, Node>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  const adj = new Map<string, Set<string>>();
  const keyObjMap = new Map<string, ColumnEndpoint>();

  for (const edge of edges) {
    const sNode = nodeMap.get(edge.source);
    const sSchema = (sNode?.data?.schema as string) || "";
    const sTable = sNode ? (sNode.data.label as string) : edge.source.includes(".") ? edge.source.split(".").pop()! : edge.source;
    const sCatalog = (sNode?.data?.catalog as string) || defaultCatalog || "";

    const tNode = nodeMap.get(edge.target);
    const tSchema = (tNode?.data?.schema as string) || "";
    const tTable = tNode ? (tNode.data.label as string) : edge.target.includes(".") ? edge.target.split(".").pop()! : edge.target;
    const tCatalog = (tNode?.data?.catalog as string) || defaultCatalog || "";

    const relations = (edge.data?.relations as any[]) || [];

    for (const rel of relations) {
      if (!rel.sourceCol || !rel.targetCol) continue;
      
      const sObj: ColumnEndpoint = { catalog: sCatalog, schema: sSchema, table: sTable, column: rel.sourceCol };
      const tObj: ColumnEndpoint = { catalog: tCatalog, schema: tSchema, table: tTable, column: rel.targetCol };
      
      const sKey = JSON.stringify(sObj);
      const tKey = JSON.stringify(tObj);

      keyObjMap.set(sKey, sObj);
      keyObjMap.set(tKey, tObj);

      if (!adj.has(sKey)) adj.set(sKey, new Set());
      if (!adj.has(tKey)) adj.set(tKey, new Set());
      adj.get(sKey)!.add(tKey);
      adj.get(tKey)!.add(sKey);
    }
  }

  // BFS connected components
  const visited = new Set<string>();
  const groups: ColumnEndpoint[][] = [];

  for (const key of adj.keys()) {
    if (visited.has(key)) continue;

    const group: ColumnEndpoint[] = [];
    const queue = [key];
    visited.add(key);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      group.push(keyObjMap.get(curr)!);

      for (const neighbor of adj.get(curr) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    groups.push(group);
  }

  return groups;
}

// ── Column groups → React Flow edges ──────────────────────────────────────────

export function columnGroupsToEdges(
  groups: ColumnEndpoint[][],
  nodes: Node[],
): Edge[] {
  // Helper to find Node ID
  const findNodeId = (ep: ColumnEndpoint): string | undefined => {
    for (const n of nodes) {
      const nSchema = n.data?.schema as string;
      const nTable = n.data?.label as string;
      if (ep.schema && nSchema) {
        if (nSchema === ep.schema && nTable === ep.table) return n.id;
      } else {
        if (nTable === ep.table) return n.id;
      }
    }
    return undefined;
  };

  // Accumulate relations per ordered (source, target) pair
  const edgeMap = new Map<
    string,
    { source: string; target: string; relations: { sourceCol: string; targetCol: string }[] }
  >();

  for (const group of groups) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];

        const aId = findNodeId(a);
        const bId = findNodeId(b);
        if (!aId || !bId || aId === bId) continue;

        // Normalise so the alphabetically-first node is always "source"
        const [sourceId, targetId, sourceCol, targetCol] =
          aId < bId
            ? [aId, bId, a.column, b.column]
            : [bId, aId, b.column, a.column];

        const key = `${sourceId}-${targetId}`;
        if (!edgeMap.has(key)) {
          edgeMap.set(key, { source: sourceId, target: targetId, relations: [] });
        }
        const entry = edgeMap.get(key)!;
        if (!entry.relations.some((r) => r.sourceCol === sourceCol && r.targetCol === targetCol)) {
          entry.relations.push({ sourceCol, targetCol });
        }
      }
    }
  }

  return Array.from(edgeMap.values()).map(({ source, target, relations }) => ({
    id: `edge-${source}-${target}`,
    source,
    target,
    sourceHandle: "table-source",
    targetHandle: "table-target",
    type: "relationshipEdge",
    animated: false,
    selected: false,
    style: { stroke: "var(--color-amber)", strokeWidth: 1.5 },
    data: { relations },
  }));
}
