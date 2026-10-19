import { AlertTriangle } from 'lucide-react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { WorkflowFlowNode } from '../serialization';
import { NodeShell } from './NodeShell';

export function UnknownNode(props: NodeProps<WorkflowFlowNode>) {
  const inputs = props.data.unknownInputHandles?.length ? props.data.unknownInputHandles : [{ type: 'main' as const, index: 0 }];
  const outputs = props.data.unknownOutputHandles?.length ? props.data.unknownOutputHandles : [{ type: 'main' as const, index: 0 }];

  return (
    <div className="relative px-4 pb-1 pt-4">
      {inputs.map((port, index) => <Handle key={`in-${port.type}:${port.index}`} id={`${port.type}:${port.index}`} type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-slate-900 !bg-slate-400" style={{ top: `${((index + 1) / (inputs.length + 1)) * 100}%` }} />)}
      <NodeShell selected={props.selected ?? false} status="error" validationMessage={`Type de node inconnu : ${props.data.type}`} className="flex h-20 w-24 flex-col items-center justify-center rounded-xl border-red-500 bg-slate-800/80">
        <AlertTriangle size={24} className="text-red-400" />
        <span className="mt-1 max-w-20 truncate text-[10px] text-slate-300">{props.data.type}</span>
        {outputs.map((port, index) => <Handle key={`out-${port.type}:${port.index}`} id={`${port.type}:${port.index}`} type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-slate-900 !bg-slate-400" style={{ top: `${((index + 1) / (outputs.length + 1)) * 100}%` }} />)}
      </NodeShell>
      <div className="mt-2 max-w-36 text-center text-xs text-slate-300">{props.data.name}</div>
    </div>
  );
}
