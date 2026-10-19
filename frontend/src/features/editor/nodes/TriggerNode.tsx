import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Plus, Zap } from 'lucide-react';
import type { WorkflowFlowNode } from '../serialization';
import { NodeShell } from './NodeShell';
import { handleId, indexOutputPorts } from './ports';
import { useNodeVisualState } from './useNodeVisualState';
import { getNodeIcon } from '../icons';
import { useWorkflowStore } from '../../../stores/workflow-store';

export function TriggerNode(props: NodeProps<WorkflowFlowNode>) {
  const { description, status, validationMessage } = useNodeVisualState(props.id, props.data.type);
  const Icon = getNodeIcon(description?.icon);
  const outputs = indexOutputPorts(description?.outputs ?? [{ type: 'main', displayName: 'Sortie' }]);
  const edges = useWorkflowStore((state) => state.edges);
  const openPalette = useWorkflowStore((state) => state.openPalette);

  return (
    <div className="relative w-[136px] pb-7 pt-1">
      <Zap size={16} fill="currentColor" className="absolute -left-5 top-2 text-blue-400" aria-hidden="true" />
      <NodeShell selected={props.selected ?? false} status={status} validationMessage={validationMessage} className="node-shell flex h-24 w-24 items-center justify-center rounded-l-[48px] rounded-r-2xl" style={{ borderColor: description?.color }}>
        <Icon size={38} style={{ color: description?.color ?? 'var(--text-muted)' }} />
        {outputs.map((port) => {
          const portId = handleId(port.type, port.index);
          const connected = edges.some((edge) => edge.source === props.id && edge.sourceHandle === portId);
          return <div key={portId} className="pointer-events-none absolute inset-0 z-20">
            <Handle id={portId} type="source" position={Position.Right} isConnectable isConnectableStart className="source-output-handle !z-20 !h-2.5 !w-2.5 !border-2 !border-[var(--bg-surface)] !bg-slate-300" style={{ top: `${((port.index + 1) / (outputs.length + 1)) * 100}%` }} />
            {port.type === 'main' && !connected && <button type="button" className="nodrag pointer-events-auto absolute right-[-34px] top-1/2 z-30 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md border border-slate-600 bg-slate-800 text-slate-400 hover:border-blue-400 hover:text-blue-400" title="Ajouter après le déclencheur" aria-label="Ajouter après le déclencheur" onClick={(event) => { event.stopPropagation(); openPalette({ handleType: 'main', mode: 'accept-input', sourceNodeId: props.id, sourceHandleId: portId, placement: 'after-source' }); }}><Plus size={14} /></button>}
          </div>;
        })}
      </NodeShell>
      <div className="mt-2 max-w-[136px] text-center"><span className="block truncate text-sm font-semibold text-slate-200">{props.data.name}</span>{props.data.subtitle && <span className="mt-1 block truncate text-xs text-slate-500">{props.data.subtitle}</span>}</div>
    </div>
  );
}
