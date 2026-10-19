import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Plus } from 'lucide-react';
import type { WorkflowFlowNode } from '../serialization';
import { NodeShell } from './NodeShell';
import { handleId, indexInputPorts, indexOutputPorts } from './ports';
import { useNodeVisualState } from './useNodeVisualState';
import { getNodeIcon } from '../icons';
import { useWorkflowStore } from '../../../stores/workflow-store';

const PORT_COLORS: Record<string, string> = {
  ai_languageModel: 'var(--info)',
  ai_memory: 'var(--warning)',
  ai_tool: 'var(--primary)',
};

export function AgentNode(props: NodeProps<WorkflowFlowNode>) {
  const { description, status, validationMessage } = useNodeVisualState(props.id, props.data.type);
  const Icon = getNodeIcon(description?.icon);
  const inputs = indexInputPorts(description?.inputs ?? []).filter((port) => port.type.startsWith('ai_'));
  const mainInputs = indexInputPorts(description?.inputs ?? []).filter((port) => port.type === 'main');
  const outputs = indexOutputPorts(description?.outputs ?? [{ type: 'main' }]);
  const edges = useWorkflowStore((state) => state.edges);
  const openPalette = useWorkflowStore((state) => state.openPalette);

  return (
    <div className="relative w-[240px] pb-[58px] pt-1">
      <NodeShell selected={props.selected ?? false} status={status} validationMessage={validationMessage} className="node-shell flex h-[104px] w-[240px] items-center gap-3 rounded-2xl px-4" style={{ borderColor: description?.color }}>
        {mainInputs.map((port) => <Handle key={handleId(port.type, port.index)} id={handleId(port.type, port.index)} type="target" position={Position.Left} isConnectable isConnectableEnd className="main-input-handle !z-20 !h-2.5 !w-2.5 !border-2 !border-[var(--bg-surface)] !bg-slate-400" />)}
        <Icon size={32} className="shrink-0" style={{ color: description?.color ?? 'var(--text)' }} />
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-100">{props.data.name}</span>
          <span className="mt-1 block truncate text-xs text-slate-400">{String(props.data.parameters.role ?? description?.description ?? 'Agent IA')}</span>
        </div>
        {outputs.map((port) => {
          const portId = handleId(port.type, port.index);
          const connected = edges.some((edge) => edge.source === props.id && edge.sourceHandle === portId);
          return <div key={portId} className="pointer-events-none absolute inset-0 z-20">
            <Handle id={portId} type="source" position={Position.Right} isConnectable isConnectableStart className="source-output-handle !z-20 !h-2.5 !w-2.5 !border-2 !border-[var(--bg-surface)] !bg-slate-300" />
            {port.type === 'main' && !connected && <button type="button" className="nodrag pointer-events-auto absolute right-[-34px] top-1/2 z-30 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md border border-slate-600 bg-slate-800 text-slate-400 hover:border-blue-400 hover:text-blue-400" title="Ajouter après l’agent" aria-label="Ajouter après l’agent" onClick={(event) => { event.stopPropagation(); openPalette({ handleType: 'main', mode: 'accept-input', sourceNodeId: props.id, sourceHandleId: portId, placement: 'after-source' }); }}><Plus size={14} /></button>}
          </div>;
        })}
      </NodeShell>
      <div className="absolute left-0 right-0 top-[112px] flex justify-around">
        {inputs.map((port) => {
          const connectedCount = edges.filter((edge) => edge.target === props.id && edge.targetHandle === handleId(port.type, port.index)).length;
          const canAdd = !port.maxConnections || connectedCount < port.maxConnections;
          const label = port.displayName ?? port.type.replace('ai_', '').replace('_', ' ');
          return (
            <div key={handleId(port.type, port.index)} className="relative flex w-1/3 flex-col items-center">
              <Handle id={handleId(port.type, port.index)} type="target" position={Position.Top} isConnectable isConnectableEnd className="ai-input-handle !z-20 !h-2.5 !w-2.5 !border-2 !border-[var(--bg-surface)]" style={{ backgroundColor: PORT_COLORS[port.type] ?? 'var(--text-muted)' }} />
              <span className="mt-2 whitespace-nowrap text-[11px] text-slate-400">{label}{port.required && connectedCount === 0 ? <span className="ml-0.5 text-red-400">*</span> : null}</span>
              {canAdd && <button type="button" className="nodrag mt-1 flex h-6 w-6 items-center justify-center rounded-md border border-slate-600 bg-slate-800 text-slate-400 transition-colors hover:border-blue-400 hover:text-blue-400" title={`Ajouter ${label}`} aria-label={`Ajouter ${label}`} onClick={(event) => { event.stopPropagation(); openPalette({ handleType: port.type, mode: 'accept-output', targetNodeId: props.id, targetHandleId: handleId(port.type, port.index), placement: 'below-target' }); }}><Plus size={14} /></button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
