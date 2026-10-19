import { BaseEdge, EdgeLabelRenderer, getBezierPath, MarkerType, type EdgeProps } from '@xyflow/react';
import { useRunStore } from '../../../stores/run-store';
import type { WorkflowFlowEdge } from '../serialization';

const TYPE_COLORS: Record<string, string> = {
  ai_languageModel: 'var(--info)',
  ai_memory: 'var(--warning)',
  ai_tool: 'var(--primary)',
};

export function WorkflowEdge(props: EdgeProps<WorkflowFlowEdge>) {
  const sourceState = useRunStore((state) => state.nodeStates[props.source]);
  const connectionType = props.data?.connectionType ?? 'main';
  const isMain = connectionType === 'main';
  const color = isMain
    ? sourceState?.status === 'success' ? 'var(--success)' : sourceState?.status === 'warning' ? 'var(--warning)' : 'var(--border-strong)'
    : TYPE_COLORS[connectionType] ?? 'var(--primary)';
  const [path, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  });
  const outputCount = sourceState?.outputCounts?.[props.data?.outputIndex ?? 0];

  return (
    <>
      <BaseEdge id={props.id} path={path} markerEnd={MarkerType.ArrowClosed} style={{ stroke: color, strokeWidth: 2, strokeDasharray: isMain ? undefined : '4 4' }} className={sourceState?.status === 'running' ? 'workflow-edge-running' : undefined} />
      {isMain && outputCount !== undefined && (
        <EdgeLabelRenderer>
          <div className="nodrag nopan pointer-events-none absolute rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-300" style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}>
            {outputCount} items
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
