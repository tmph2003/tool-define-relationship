import type { Node, Edge } from "@xyflow/react";
import type { TableNodeData } from "../components/TableNode";

export function generateSuggestedEdges(nodes: Node[], edges: Edge[]): Edge[] {
  const suggested: Edge[] = [];
  const existingEdgeIds = new Set(edges.map((e) => e.id));

  // Helper to singularize simple table names (e.g. users -> user)
  const singularize = (str: string) => (str.endsWith("s") ? str.slice(0, -1) : str);

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];

      const dataA = nodeA.data as unknown as TableNodeData;
      const dataB = nodeB.data as unknown as TableNodeData;

      if (!dataA.columns || !dataB.columns) continue;

      const labelA = dataA.label.toLowerCase();
      const labelB = dataB.label.toLowerCase();
      const singularA = singularize(labelA);
      const singularB = singularize(labelB);

      for (const colA of dataA.columns) {
        for (const colB of dataB.columns) {
          // Must have exactly same datatype
          if (colA.type.toLowerCase() !== colB.type.toLowerCase()) continue;

          let match = false;
          let sourceNode = nodeA.id;
          let targetNode = nodeB.id;
          let sourceCol = colA.name;
          let targetCol = colB.name;

          // Condition 1: Same column name (and both are not just "id")
          if (colA.name === colB.name && colA.name !== "id") {
            match = true;
          }
          // Condition 2: colA is '{tableB}_id' and colB is 'id'
          else if ((colA.name === `${labelB}_id` || colA.name === `${singularB}_id`) && colB.name === "id") {
            match = true;
            sourceNode = nodeA.id;
            targetNode = nodeB.id;
            sourceCol = colA.name;
            targetCol = colB.name;
          }
          // Condition 3: colB is '{tableA}_id' and colA is 'id'
          else if ((colB.name === `${labelA}_id` || colB.name === `${singularA}_id`) && colA.name === "id") {
            match = true;
            sourceNode = nodeB.id;
            targetNode = nodeA.id;
            sourceCol = colB.name;
            targetCol = colA.name;
          }

          if (match) {
            const edgeId = `${sourceNode}.${sourceCol}→${targetNode}.${targetCol}`;
            
            // Check if this connection already exists (either as suggested or regular)
            // Need to check both directions just in case
            const reverseId = `${targetNode}.${targetCol}→${sourceNode}.${sourceCol}`;
            
            if (!existingEdgeIds.has(edgeId) && !existingEdgeIds.has(reverseId)) {
              suggested.push({
                id: edgeId,
                source: sourceNode,
                sourceHandle: `${sourceCol}-source`,
                target: targetNode,
                targetHandle: `${targetCol}-target`,
                type: "suggestedEdge",
                animated: true,
                style: { stroke: "#6B7280", strokeWidth: 2, strokeDasharray: "4 4" },
                data: {
                  relationship_type: "one_to_many",
                  join_type: "LEFT",
                  active: true,
                },
              });
              existingEdgeIds.add(edgeId); // Prevent duplicates in the same pass
            }
          }
        }
      }
    }
  }

  return suggested;
}
