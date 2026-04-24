import { getSmoothStepPath, type EdgeProps, useStore, Position } from "@xyflow/react";

export default function RelationshipEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  selected,
}: EdgeProps) {
  const sourceNode = useStore(s => s.nodeLookup.get(source));
  const targetNode = useStore(s => s.nodeLookup.get(target));

  let finalSourceX = sourceX;
  let finalSourcePosition = sourcePosition;
  let finalTargetX = targetX;
  let finalTargetPosition = targetPosition;

  if (sourceNode && targetNode) {
    const sX = sourceNode.internals?.positionAbsolute?.x ?? sourceNode.position.x;
    const sW = sourceNode.measured?.width ?? 220;
    const tX = targetNode.internals?.positionAbsolute?.x ?? targetNode.position.x;
    const tW = targetNode.measured?.width ?? 220;

    const sourceIsLeft = sX + sW < tX;
    const targetIsLeft = tX + tW < sX;

    if (sourceIsLeft) {
      finalSourceX = sX + sW;
      finalSourcePosition = Position.Right;
      finalTargetX = tX;
      finalTargetPosition = Position.Left;
    } else if (targetIsLeft) {
      finalSourceX = sX;
      finalSourcePosition = Position.Left;
      finalTargetX = tX + tW;
      finalTargetPosition = Position.Right;
    } else {
      if (sX + sW / 2 < tX + tW / 2) {
        finalSourceX = sX;
        finalSourcePosition = Position.Left;
        finalTargetX = tX + tW;
        finalTargetPosition = Position.Right;
      } else {
        finalSourceX = sX + sW;
        finalSourcePosition = Position.Right;
        finalTargetX = tX;
        finalTargetPosition = Position.Left;
      }
    }
  }

  const [edgePath] = getSmoothStepPath({
    sourceX: finalSourceX,
    sourceY,
    sourcePosition: finalSourcePosition,
    targetX: finalTargetX,
    targetY,
    targetPosition: finalTargetPosition,
    borderRadius: 16,
  });

  return (
    <g className="react-flow__edge-interaction">
      {/* Invisible wide path for easy click targeting */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        style={{ pointerEvents: "stroke", cursor: "pointer" }}
      />
      {/* Visible edge path */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        className="react-flow__edge-path"
        style={{
          ...style,
          markerEnd: "none",
          stroke: selected ? "var(--color-amber)" : (style.stroke || "var(--color-text-3)"),
          strokeWidth: selected ? 2.5 : 1.5,
          filter: selected ? "drop-shadow(0 0 6px var(--color-amber))" : "none",
          transition: "stroke 0.15s, stroke-width 0.15s, filter 0.15s",
          pointerEvents: "none",
        }}
      />
    </g>
  );
}

