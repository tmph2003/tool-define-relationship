import { getSmoothStepPath, EdgeProps, BaseEdge, useStore, Position } from '@xyflow/react';

export default function SmartEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
}: EdgeProps) {
  const sourceNode = useStore(s => s.nodeLookup.get(source));
  const targetNode = useStore(s => s.nodeLookup.get(target));

  if (!sourceNode || !targetNode) return null;

  // X positions
  const sX = sourceNode.internals?.positionAbsolute?.x ?? sourceNode.position.x;
  const sW = sourceNode.measured?.width ?? 220;
  const tX = targetNode.internals?.positionAbsolute?.x ?? targetNode.position.x;
  const tW = targetNode.measured?.width ?? 220;

  const sourceIsLeft = sX + sW < tX;
  const targetIsLeft = tX + tW < sX;

  let finalSourceX = sourceX;
  let finalSourcePosition = sourcePosition;
  let finalTargetX = targetX;
  let finalTargetPosition = targetPosition;

  if (sourceIsLeft) {
    // source on left, target on right -> source emits right, target receives left
    finalSourceX = sX + sW;
    finalSourcePosition = Position.Right;
    finalTargetX = tX;
    finalTargetPosition = Position.Left;
  } else if (targetIsLeft) {
    // source on right, target on left -> source emits left, target receives right
    finalSourceX = sX;
    finalSourcePosition = Position.Left;
    finalTargetX = tX + tW;
    finalTargetPosition = Position.Right;
  } else {
    // Overlapping horizontally. Try to route cleanly outside
    // If source center is left of target center
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
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          strokeWidth: selected ? 2.5 : 1.5,
          stroke: selected ? "var(--color-amber)" : "var(--color-amber-muted)",
          transition: "stroke 0.2s, stroke-width 0.2s",
        }}
        markerEnd={markerEnd}
        interactionWidth={20}
      />
    </>
  );
}
