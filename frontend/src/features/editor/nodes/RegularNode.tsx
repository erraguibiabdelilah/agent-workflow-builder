import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Plus } from 'lucide-react';
import type { WorkflowFlowNode } from '../serialization';
import { NodeShell } from './NodeShell';
import { handleId, indexInputPorts, indexOutputPorts } from './ports';
import { useNodeVisualState } from './useNodeVisualState';
import { getNodeIcon } from '../icons';
import { useWorkflowStore } from '../../../stores/workflow-store';

export function RegularNode(props: NodeProps<WorkflowFlowNode>) {
  const { description, status, validationMessage } = useNodeVisualState(props.id, props.data.type);
  const Icon = getNodeIcon(description?.icon);
  const inputs = indexInputPorts(description?.inputs ?? [{ type: 'main' }]).filter((port) => port.type === 'main');
  const outputs = indexOutputPorts(description?.outputs ?? [{ type: 'main' }]);
  const edges = useWorkflowStore((state) => state.edges);
  const openPalette = useWorkflowStore((state) => state.openPalette);

  return (
    <div className="relative w-[136px] pb-7 pt-1">
      <NodeShell selected={props.selected ?? false} status={status} validationMessage={validationMessage} className="node-shell flex h-24 w-24 items-center justify-center rounded-2xl" style={{ borderColor: description?.color }}>
        {inputs.map((port) => <Handle key={handleId(port.type, port.index)} id={handleId(port.type, port.index)} type="target" position={Position.Left} isConnectable isConnectableEnd className="main-input-handle !z-20 !h-2.5 !w-2.5 !border-2 !border-[var(--bg-surface)] !bg-slate-400" style={{ top: `${((port.index + 1) / (inputs.length + 1)) * 100}%` }} />)}
        <Icon size={38} style={{ color: description?.color ?? 'var(--text)' }} />
        {outputs.map((port) => {
          const portId = handleId(port.type, port.index);
          const connected = edges.some((edge) => edge.source === props.id && edge.sourceHandle === portId);
          return <div key={portId} className="pointer-events-none absolute inset-0 z-20">
            <Handle id={portId} type="source" position={Position.Right} isConnectable isConnectableStart className="source-output-handle !z-20 !h-2.5 !w-2.5 !border-2 !border-[var(--bg-surface)] !bg-slate-300" style={{ top: `${((port.index + 1) / (outputs.length + 1)) * 100}%` }} />
            {outputs.length > 1 && <span className="pointer-events-none absolute right-[-68px] w-16 -translate-y-1/2 text-[10px] text-slate-400" style={{ top: `${((port.index + 1) / (outputs.length + 1)) * 100}%` }}>{port.displayName ?? `Sortie ${port.index + 1}`}</span>}
            {port.type === 'main' && !connected && <button type="button" className="nodrag pointer-events-auto absolute right-[-34px] z-30 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md border border-slate-600 bg-slate-800 text-slate-400 hover:border-blue-400 hover:text-blue-400" style={{ top: `${((port.index + 1) / (outputs.length + 1)) * 100}%` }} title="Ajouter après cette sortie" aria-label="Ajouter après cette sortie" onClick={(event) => { event.stopPropagation(); openPalette({ handleType: 'main', mode: 'accept-input', sourceNodeId: props.id, sourceHandleId: portId, placement: 'after-source' }); }}><Plus size={14} /></button>}
          </div>;
        })}
      </NodeShell>
      <div className="mt-2 max-w-[136px] text-center">
        <span className="block line-clamp-2 text-sm font-semibold leading-4 text-slate-200">{props.data.name}</span>
        {props.data.subtitle && <span className="mt-1 block truncate text-xs text-slate-500">{props.data.subtitle}</span>}
      </div>
    </div>
  );
}
