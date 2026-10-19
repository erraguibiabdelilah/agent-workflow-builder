import type { ReactNode } from 'react';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import type { NodeStatus } from '../../../../shared/src/events';

interface StatusIconProps {
  status: NodeStatus;
  validationMessage?: string;
}

export function StatusIcon({ status, validationMessage }: StatusIconProps) {
  const effectiveStatus = status === 'idle' && validationMessage ? 'error' : status;
  if (effectiveStatus === 'idle') return null;

  const title = validationMessage ?? {
    running: 'En cours',
    success: 'Terminé',
    warning: 'Terminé avec avertissement',
    error: 'Échec',
    skipped: 'Ignoré',
    idle: '',
  }[effectiveStatus];

  return (
    <span
      className={`status-dot absolute bottom-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border ${effectiveStatus === 'error' ? 'text-red-400' : effectiveStatus === 'warning' ? 'text-amber-400' : effectiveStatus === 'success' ? 'text-emerald-400' : effectiveStatus === 'running' ? 'text-blue-400' : 'text-slate-500'}`}
      title={title}
      aria-label={title}
    >
      {effectiveStatus === 'running' ? <Loader2 size={14} className="animate-spin" />
        : effectiveStatus === 'success' ? <Check size={14} />
          : <AlertTriangle size={14} />}
    </span>
  );
}

interface NodeShellProps {
  children: ReactNode;
  selected: boolean;
  status: NodeStatus;
  validationMessage?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function NodeShell({ children, selected, status, validationMessage, className = '', style }: NodeShellProps) {
  const visualStatus = validationMessage && status === 'idle' ? 'error' : status;
  return (
    <div data-status={visualStatus} className={`node-shell relative border transition-colors ${selected ? 'node-selected' : ''} ${visualStatus === 'skipped' ? 'opacity-40' : ''} ${visualStatus === 'running' ? 'animate-pulse' : ''} ${className}`} style={style}>
      {children}
      <StatusIcon status={status} validationMessage={validationMessage} />
    </div>
  );
}
