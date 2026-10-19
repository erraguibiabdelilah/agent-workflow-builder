import { z } from 'zod';

export type ExecutionStatus = 'running' | 'success' | 'error' | 'cancelled';
export type NodeStatus = 'idle' | 'running' | 'success' | 'warning' | 'error' | 'skipped';

export const executionStatusSchema = z.enum(['running', 'success', 'error', 'cancelled']);
export const nodeStatusSchema = z.enum(['idle', 'running', 'success', 'warning', 'error', 'skipped']);

export interface ExecutionStartEvent {
  type: 'execution:start';
  executionId: string;
  workflowId: string;
  startedAt: string;
}

export interface NodeStartEvent {
  type: 'node:start';
  executionId: string;
  nodeId: string;
  startedAt: string;
}

export interface NodeSuccessEvent {
  type: 'node:success';
  executionId: string;
  nodeId: string;
  durationMs: number;
  outputCounts: number[];
  warning?: string;
}

export interface NodeErrorEvent {
  type: 'node:error';
  executionId: string;
  nodeId: string;
  durationMs?: number;
  error: { message: string; type: string };
}

export interface NodeSkippedEvent {
  type: 'node:skipped';
  executionId: string;
  nodeId: string;
}

export interface ExecutionFinishEvent {
  type: 'execution:finish';
  executionId: string;
  status: 'success' | 'error' | 'cancelled';
  finishedAt: string;
  error?: { message: string; type: string; nodeId?: string };
}

export type ExecutionEvent =
  | ExecutionStartEvent
  | NodeStartEvent
  | NodeSuccessEvent
  | NodeErrorEvent
  | NodeSkippedEvent
  | ExecutionFinishEvent;

export const executionEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('execution:start'), executionId: z.string(), workflowId: z.string(), startedAt: z.string() }),
  z.object({ type: z.literal('node:start'), executionId: z.string(), nodeId: z.string(), startedAt: z.string() }),
  z.object({ type: z.literal('node:success'), executionId: z.string(), nodeId: z.string(), durationMs: z.number(), outputCounts: z.array(z.number()), warning: z.string().optional() }),
  z.object({ type: z.literal('node:error'), executionId: z.string(), nodeId: z.string(), durationMs: z.number().optional(), error: z.object({ message: z.string(), type: z.string() }) }),
  z.object({ type: z.literal('node:skipped'), executionId: z.string(), nodeId: z.string() }),
  z.object({ type: z.literal('execution:finish'), executionId: z.string(), status: z.enum(['success', 'error', 'cancelled']), finishedAt: z.string(), error: z.object({ message: z.string(), type: z.string(), nodeId: z.string().optional() }).optional() }),
]);
