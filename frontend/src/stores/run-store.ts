import { create } from 'zustand';
import type { ExecutionEvent, ExecutionStatus, NodeStatus } from '../../shared/src/events';

export interface NodeRunState {
  status: NodeStatus;
  error?: { message: string; type: string };
  warning?: string;
  outputCounts?: number[];
  durationMs?: number;
  startedAt?: number;
}

interface RunState {
  executionId: string | null;
  executionStatus: ExecutionStatus | 'idle';
  nodeStates: Record<string, NodeRunState>;
  staleResults: boolean;
  startRun: (executionId: string) => void;
  failRun: () => void;
  applyEvent: (event: ExecutionEvent) => void;
  markWorkflowChanged: () => void;
  reset: () => void;
}

const RUNNING_MIN_MS = 150;
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearPendingTimers() {
  for (const timer of pendingTimers.values()) clearTimeout(timer);
  pendingTimers.clear();
}

export const useRunStore = create<RunState>((set, get) => ({
  executionId: null,
  executionStatus: 'idle',
  nodeStates: {},
  staleResults: false,

  startRun: (executionId) => {
    clearPendingTimers();
    set({ executionId, executionStatus: 'running', nodeStates: {}, staleResults: false });
  },

  failRun: () => set({ executionStatus: 'error' }),

  applyEvent: (event) => {
    if (event.executionId !== get().executionId && event.type !== 'execution:start') return;

    if (event.type === 'execution:start') {
      set({ executionId: event.executionId, executionStatus: 'running' });
      return;
    }

    if (event.type === 'execution:finish') {
      set({ executionStatus: event.status });
      return;
    }

    if (event.type === 'node:start') {
      const startedAt = Date.now();
      set((state) => ({
        nodeStates: { ...state.nodeStates, [event.nodeId]: { status: 'running', startedAt } },
      }));
      return;
    }

    const previous = get().nodeStates[event.nodeId];
    const terminal: NodeRunState = event.type === 'node:success'
      ? { status: event.warning ? 'warning' : 'success', outputCounts: event.outputCounts, warning: event.warning, durationMs: event.durationMs }
      : event.type === 'node:error'
        ? { status: 'error', error: event.error, durationMs: event.durationMs }
        : { status: 'skipped' };

    const startedAt = previous?.startedAt;
    const elapsed = startedAt === undefined ? RUNNING_MIN_MS : Date.now() - startedAt;
    const delay = Math.max(0, RUNNING_MIN_MS - elapsed);
    const applyTerminal = () => {
      set((state) => ({
        nodeStates: { ...state.nodeStates, [event.nodeId]: terminal },
      }));
      pendingTimers.delete(event.nodeId);
    };

    if (delay === 0) {
      applyTerminal();
    } else {
      const oldTimer = pendingTimers.get(event.nodeId);
      if (oldTimer) clearTimeout(oldTimer);
      pendingTimers.set(event.nodeId, setTimeout(applyTerminal, delay));
    }
  },

  markWorkflowChanged: () => {
    if (get().executionId) set({ staleResults: true });
  },

  reset: () => {
    clearPendingTimers();
    set({ executionId: null, executionStatus: 'idle', nodeStates: {}, staleResults: false });
  },
}));
