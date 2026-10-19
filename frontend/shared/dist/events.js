import { z } from 'zod';
export const executionStatusSchema = z.enum(['running', 'success', 'error', 'cancelled']);
export const nodeStatusSchema = z.enum(['idle', 'running', 'success', 'warning', 'error', 'skipped']);
export const executionStartEventSchema = z.object({
    type: z.literal('execution:start'),
    executionId: z.string(),
    workflowId: z.string(),
    startedAt: z.string(),
    mode: z.enum(['manual', 'trigger', 'webhook']),
});
export const executionEndEventSchema = z.object({
    type: z.literal('execution:end'),
    executionId: z.string(),
    status: executionStatusSchema,
    finishedAt: z.string(),
    error: z.object({
        type: z.string(),
        message: z.string(),
        details: z.unknown().optional(),
    }).optional(),
});
export const nodeStartEventSchema = z.object({
    type: z.literal('node:start'),
    executionId: z.string(),
    nodeId: z.string(),
    nodeName: z.string(),
    startedAt: z.string(),
});
export const nodeEndEventSchema = z.object({
    type: z.literal('node:end'),
    executionId: z.string(),
    nodeId: z.string(),
    nodeName: z.string(),
    status: nodeStatusSchema,
    finishedAt: z.string(),
    outputCounts: z.record(z.number()).optional(),
    error: z.object({
        type: z.string(),
        message: z.string(),
        sourceNodeId: z.string().optional(),
        details: z.unknown().optional(),
    }).optional(),
});
export const nodeProgressEventSchema = z.object({
    type: z.literal('node:progress'),
    executionId: z.string(),
    nodeId: z.string(),
    nodeName: z.string(),
    progress: z.object({
        step: z.string(),
        current: z.number(),
        total: z.number().optional(),
    }),
});
export const executionEventSchema = z.discriminatedUnion('type', [
    executionStartEventSchema,
    executionEndEventSchema,
    nodeStartEventSchema,
    nodeEndEventSchema,
    nodeProgressEventSchema,
]);
//# sourceMappingURL=events.js.map