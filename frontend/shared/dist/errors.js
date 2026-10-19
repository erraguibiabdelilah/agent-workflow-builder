import { z } from 'zod';
export const nodeErrorTypeSchema = z.enum([
    'validation',
    'config',
    'auth',
    'rate_limit',
    'timeout',
    'network',
    'tool',
    'unknown'
]);
export class NodeError extends Error {
    type;
    opts;
    constructor(message, // message utilisateur, en français
    type, opts) {
        super(message);
        this.type = type;
        this.opts = opts;
        this.name = 'NodeError';
    }
}
export const nodeErrorDataSchema = z.object({
    type: nodeErrorTypeSchema,
    message: z.string().min(1),
    sourceNodeId: z.string().optional(),
    details: z.unknown().optional(),
});
export const apiErrorCodeSchema = z.enum([
    'unauthorized',
    'forbidden',
    'not_found',
    'validation_error',
    'payload_too_large',
    'rate_limited',
    'internal_error'
]);
export const apiErrorSchema = z.object({
    error: z.object({
        code: apiErrorCodeSchema,
        message: z.string().min(1),
        details: z.unknown().optional(),
    }),
});
export class AppError extends Error {
    code;
    status;
    details;
    constructor(code, status, message, details) {
        super(message);
        this.code = code;
        this.status = status;
        this.details = details;
        this.name = 'AppError';
    }
}
//# sourceMappingURL=errors.js.map