import { z } from 'zod';
export type ExecutionStatus = 'running' | 'success' | 'error' | 'cancelled';
export type NodeStatus = 'idle' | 'running' | 'success' | 'warning' | 'error' | 'skipped';
export declare const executionStatusSchema: z.ZodEnum<["running", "success", "error", "cancelled"]>;
export declare const nodeStatusSchema: z.ZodEnum<["idle", "running", "success", "warning", "error", "skipped"]>;
export interface ExecutionStartEvent {
    type: 'execution:start';
    executionId: string;
    workflowId: string;
    startedAt: string;
    mode: 'manual' | 'trigger' | 'webhook';
}
export interface ExecutionEndEvent {
    type: 'execution:end';
    executionId: string;
    status: ExecutionStatus;
    finishedAt: string;
    error?: {
        type: string;
        message: string;
        details?: unknown;
    };
}
export interface NodeStartEvent {
    type: 'node:start';
    executionId: string;
    nodeId: string;
    nodeName: string;
    startedAt: string;
}
export interface NodeEndEvent {
    type: 'node:end';
    executionId: string;
    nodeId: string;
    nodeName: string;
    status: NodeStatus;
    finishedAt: string;
    outputCounts?: Record<string, number>;
    error?: {
        type: string;
        message: string;
        sourceNodeId?: string;
        details?: unknown;
    };
}
export interface NodeProgressEvent {
    type: 'node:progress';
    executionId: string;
    nodeId: string;
    nodeName: string;
    progress: {
        step: string;
        current: number;
        total?: number;
    };
}
export type ExecutionEvent = ExecutionStartEvent | ExecutionEndEvent | NodeStartEvent | NodeEndEvent | NodeProgressEvent;
export declare const executionStartEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"execution:start">;
    executionId: z.ZodString;
    workflowId: z.ZodString;
    startedAt: z.ZodString;
    mode: z.ZodEnum<["manual", "trigger", "webhook"]>;
}, "strip", z.ZodTypeAny, {
    type: "execution:start";
    executionId: string;
    workflowId: string;
    startedAt: string;
    mode: "manual" | "trigger" | "webhook";
}, {
    type: "execution:start";
    executionId: string;
    workflowId: string;
    startedAt: string;
    mode: "manual" | "trigger" | "webhook";
}>;
export declare const executionEndEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"execution:end">;
    executionId: z.ZodString;
    status: z.ZodEnum<["running", "success", "error", "cancelled"]>;
    finishedAt: z.ZodString;
    error: z.ZodOptional<z.ZodObject<{
        type: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        message: string;
        details?: unknown;
    }, {
        type: string;
        message: string;
        details?: unknown;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "execution:end";
    status: "error" | "running" | "success" | "cancelled";
    executionId: string;
    finishedAt: string;
    error?: {
        type: string;
        message: string;
        details?: unknown;
    } | undefined;
}, {
    type: "execution:end";
    status: "error" | "running" | "success" | "cancelled";
    executionId: string;
    finishedAt: string;
    error?: {
        type: string;
        message: string;
        details?: unknown;
    } | undefined;
}>;
export declare const nodeStartEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"node:start">;
    executionId: z.ZodString;
    nodeId: z.ZodString;
    nodeName: z.ZodString;
    startedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "node:start";
    executionId: string;
    startedAt: string;
    nodeId: string;
    nodeName: string;
}, {
    type: "node:start";
    executionId: string;
    startedAt: string;
    nodeId: string;
    nodeName: string;
}>;
export declare const nodeEndEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"node:end">;
    executionId: z.ZodString;
    nodeId: z.ZodString;
    nodeName: z.ZodString;
    status: z.ZodEnum<["idle", "running", "success", "warning", "error", "skipped"]>;
    finishedAt: z.ZodString;
    outputCounts: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    error: z.ZodOptional<z.ZodObject<{
        type: z.ZodString;
        message: z.ZodString;
        sourceNodeId: z.ZodOptional<z.ZodString>;
        details: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        message: string;
        sourceNodeId?: string | undefined;
        details?: unknown;
    }, {
        type: string;
        message: string;
        sourceNodeId?: string | undefined;
        details?: unknown;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "node:end";
    status: "error" | "running" | "success" | "idle" | "warning" | "skipped";
    executionId: string;
    finishedAt: string;
    nodeId: string;
    nodeName: string;
    error?: {
        type: string;
        message: string;
        sourceNodeId?: string | undefined;
        details?: unknown;
    } | undefined;
    outputCounts?: Record<string, number> | undefined;
}, {
    type: "node:end";
    status: "error" | "running" | "success" | "idle" | "warning" | "skipped";
    executionId: string;
    finishedAt: string;
    nodeId: string;
    nodeName: string;
    error?: {
        type: string;
        message: string;
        sourceNodeId?: string | undefined;
        details?: unknown;
    } | undefined;
    outputCounts?: Record<string, number> | undefined;
}>;
export declare const nodeProgressEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"node:progress">;
    executionId: z.ZodString;
    nodeId: z.ZodString;
    nodeName: z.ZodString;
    progress: z.ZodObject<{
        step: z.ZodString;
        current: z.ZodNumber;
        total: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        step: string;
        current: number;
        total?: number | undefined;
    }, {
        step: string;
        current: number;
        total?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "node:progress";
    executionId: string;
    nodeId: string;
    nodeName: string;
    progress: {
        step: string;
        current: number;
        total?: number | undefined;
    };
}, {
    type: "node:progress";
    executionId: string;
    nodeId: string;
    nodeName: string;
    progress: {
        step: string;
        current: number;
        total?: number | undefined;
    };
}>;
export declare const executionEventSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"execution:start">;
    executionId: z.ZodString;
    workflowId: z.ZodString;
    startedAt: z.ZodString;
    mode: z.ZodEnum<["manual", "trigger", "webhook"]>;
}, "strip", z.ZodTypeAny, {
    type: "execution:start";
    executionId: string;
    workflowId: string;
    startedAt: string;
    mode: "manual" | "trigger" | "webhook";
}, {
    type: "execution:start";
    executionId: string;
    workflowId: string;
    startedAt: string;
    mode: "manual" | "trigger" | "webhook";
}>, z.ZodObject<{
    type: z.ZodLiteral<"execution:end">;
    executionId: z.ZodString;
    status: z.ZodEnum<["running", "success", "error", "cancelled"]>;
    finishedAt: z.ZodString;
    error: z.ZodOptional<z.ZodObject<{
        type: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        message: string;
        details?: unknown;
    }, {
        type: string;
        message: string;
        details?: unknown;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "execution:end";
    status: "error" | "running" | "success" | "cancelled";
    executionId: string;
    finishedAt: string;
    error?: {
        type: string;
        message: string;
        details?: unknown;
    } | undefined;
}, {
    type: "execution:end";
    status: "error" | "running" | "success" | "cancelled";
    executionId: string;
    finishedAt: string;
    error?: {
        type: string;
        message: string;
        details?: unknown;
    } | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"node:start">;
    executionId: z.ZodString;
    nodeId: z.ZodString;
    nodeName: z.ZodString;
    startedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "node:start";
    executionId: string;
    startedAt: string;
    nodeId: string;
    nodeName: string;
}, {
    type: "node:start";
    executionId: string;
    startedAt: string;
    nodeId: string;
    nodeName: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"node:end">;
    executionId: z.ZodString;
    nodeId: z.ZodString;
    nodeName: z.ZodString;
    status: z.ZodEnum<["idle", "running", "success", "warning", "error", "skipped"]>;
    finishedAt: z.ZodString;
    outputCounts: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    error: z.ZodOptional<z.ZodObject<{
        type: z.ZodString;
        message: z.ZodString;
        sourceNodeId: z.ZodOptional<z.ZodString>;
        details: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        message: string;
        sourceNodeId?: string | undefined;
        details?: unknown;
    }, {
        type: string;
        message: string;
        sourceNodeId?: string | undefined;
        details?: unknown;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "node:end";
    status: "error" | "running" | "success" | "idle" | "warning" | "skipped";
    executionId: string;
    finishedAt: string;
    nodeId: string;
    nodeName: string;
    error?: {
        type: string;
        message: string;
        sourceNodeId?: string | undefined;
        details?: unknown;
    } | undefined;
    outputCounts?: Record<string, number> | undefined;
}, {
    type: "node:end";
    status: "error" | "running" | "success" | "idle" | "warning" | "skipped";
    executionId: string;
    finishedAt: string;
    nodeId: string;
    nodeName: string;
    error?: {
        type: string;
        message: string;
        sourceNodeId?: string | undefined;
        details?: unknown;
    } | undefined;
    outputCounts?: Record<string, number> | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"node:progress">;
    executionId: z.ZodString;
    nodeId: z.ZodString;
    nodeName: z.ZodString;
    progress: z.ZodObject<{
        step: z.ZodString;
        current: z.ZodNumber;
        total: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        step: string;
        current: number;
        total?: number | undefined;
    }, {
        step: string;
        current: number;
        total?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "node:progress";
    executionId: string;
    nodeId: string;
    nodeName: string;
    progress: {
        step: string;
        current: number;
        total?: number | undefined;
    };
}, {
    type: "node:progress";
    executionId: string;
    nodeId: string;
    nodeName: string;
    progress: {
        step: string;
        current: number;
        total?: number | undefined;
    };
}>]>;
//# sourceMappingURL=events.d.ts.map