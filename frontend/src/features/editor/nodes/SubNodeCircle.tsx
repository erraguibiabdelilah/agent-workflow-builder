import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { WorkflowFlowNode } from '../serialization';
import { NodeShell } from './NodeShell';
import { handleId, indexOutputPorts } from './ports';
import { useNodeVisualState } from './useNodeVisualState';
import { getNodeIcon } from '../icons';

const PORT_COLORS: Record<string, string> = {
  ai_languageModel: 'var(--info)', ai_memory: 'var(--warning)', ai_tool: 'var(--primary)',
};
const TYPE_LABELS: Record<string, string> = {
  ai_languageModel: 'Model', ai_memory: 'Memory', ai_tool: 'Tool',
};

export function SubNodeCircle(props: NodeProps<WorkflowFlowNode>) {
  const { description, status, validationMessage } = useNodeVisualState(props.id, props.data.type);
  const Icon = getNodeIcon(description?.icon);
  const outputs = indexOutputPorts(description?.outputs ?? []);
  const outputType = outputs[0]?.type;

  return (
    <div className="relative w-[116px] px-2 pb-1 pt-4 text-center">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">{TYPE_LABELS[outputType ?? ''] ?? 'Node'}</span>
      <NodeShell selected={props.selected ?? false} status={status} validationMessage={validationMessage} className="node-shell mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full" style={{ borderColor: description?.color }}>
        <Icon size={32} style={{ color: description?.color ?? 'var(--text-muted)' }} />
        {outputs.map((port) => <Handle key={handleId(port.type, port.index)} id={handleId(port.type, port.index)} type="source" position={Position.Top} isConnectable isConnectableStart className="ai-output-handle !z-20 !h-2.5 !w-2.5 !border-2 !border-[var(--bg-surface)]" style={{ backgroundColor: PORT_COLORS[port.type] ?? 'var(--text-muted)' }} />)}
      </NodeShell>
      <div className="mt-2 truncate text-xs font-semibold text-slate-200">{props.data.name}</div>
    </div>
  );
}
