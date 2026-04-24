import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";

export default function SuggestedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onAccept = data?.onAccept as ((id: string) => void) | undefined;
  const onReject = data?.onReject as ((id: string) => void) | undefined;

  return (
    <>
      <BaseEdge path={edgePath} style={style} id={id} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
            zIndex: 10,
          }}
          className="flex items-center gap-1 bg-surface-2 border border-border-mid rounded-sm shadow-lg overflow-hidden animate-fade-in-up"
        >
          <button
            onClick={() => onAccept?.(id)}
            className="flex items-center justify-center w-6 h-6 hover:bg-white/10 transition-colors"
            style={{ color: "#22C55E", cursor: "pointer", border: "none", background: "none" }}
            title="Accept Suggestion"
          >
            ✓
          </button>
          <div style={{ width: 1, height: 16, background: "var(--color-border-mid)" }} />
          <button
            onClick={() => onReject?.(id)}
            className="flex items-center justify-center w-6 h-6 hover:bg-white/10 transition-colors"
            style={{ color: "#EF4444", cursor: "pointer", border: "none", background: "none" }}
            title="Reject Suggestion"
          >
            ✕
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
