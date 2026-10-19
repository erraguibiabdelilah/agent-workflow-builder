import { z } from 'zod';
export type NodeErrorType = 'validation' | 'config' | 'auth' | 'rate_limit' | 'timeout' | 'network' | 'tool' | 'unknown';
export declare const nodeErrorTypeSchema: z.ZodEnum<["validation", "config", "auth", "rate_limit", "timeout", "network", "tool", "unknown"]>;
export declare class NodeError extends Error {
    type: NodeErrorType;
    opts?: {
        sourceNodeId?: string;
        cause?: unknown;
        details?: unknown;
    } | undefined;
    constructor(message: string, // message utilisateur, en français
    type: NodeErrorType, opts?: {
        sourceNodeId?: string;
        cause?: unknown;
        details?: unknown;
    } | undefined);
}
export interface NodeErrorData {
    type: NodeErrorType;
    message: string;
    sourceNodeId?: string;
    details?: unknown;
}
export declare const nodeErrorDataSchema: z.ZodObject<{
    type: z.ZodEnum<["validation", "config", "auth", "rate_limit", "timeout", "network", "tool", "unknown"]>;
    message: z.ZodString;
    sourceNodeId: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: "validation" | "unknown" | "config" | "auth" | "rate_limit" | "timeout" | "network" | "tool";
    message: string;
    sourceNodeId?: string | undefined;
    details?: unknown;
}, {
    type: "validation" | "unknown" | "config" | "auth" | "rate_limit" | "timeout" | "network" | "tool";
    message: string;
    sourceNodeId?: string | undefined;
    details?: unknown;
}>;
export type ApiErrorCode = 'unauthorized' | 'forbidden' | 'not_found' | 'validation_error' | 'payload_too_large' | 'rate_limited' | 'internal_error';
export declare const apiErrorCodeSchema: z.ZodEnum<["unauthorized", "forbidden", "not_found", "validation_error", "payload_too_large", "rate_limited", "internal_error"]>;
export interface ApiError {
    error: {
        code: ApiErrorCode;
        message: string;
        details?: unknown;
    };
}
export declare const apiErrorSchema: z.ZodObject<{
    error: z.ZodObject<{
        code: z.ZodEnum<["unauthorized", "forbidden", "not_found", "validation_error", "payload_too_large", "rate_limited", "internal_error"]>;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        code: "unauthorized" | "forbidden" | "not_found" | "validation_error" | "payload_too_large" | "rate_limited" | "internal_error";
        message: string;
        details?: unknown;
    }, {
        code: "unauthorized" | "forbidden" | "not_found" | "validation_error" | "payload_too_large" | "rate_limited" | "internal_error";
        message: string;
        details?: unknown;
    }>;
}, "strip", z.ZodTypeAny, {
    error: {
        code: "unauthorized" | "forbidden" | "not_found" | "validation_error" | "payload_too_large" | "rate_limited" | "internal_error";
        message: string;
        details?: unknown;
    };
}, {
    error: {
        code: "unauthorized" | "forbidden" | "not_found" | "validation_error" | "payload_too_large" | "rate_limited" | "internal_error";
        message: string;
        details?: unknown;
    };
}>;
export declare class AppError extends Error {
    code: ApiErrorCode;
    status: number;
    details?: unknown | undefined;
    constructor(code: ApiErrorCode, status: number, message: string, details?: unknown | undefined);
}
//# sourceMappingURL=errors.d.ts.map