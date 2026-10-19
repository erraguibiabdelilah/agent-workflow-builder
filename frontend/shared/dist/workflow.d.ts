import { z } from 'zod';
export type ConnectionType = 'main' | 'ai_languageModel' | 'ai_memory' | 'ai_tool';
export declare const connectionTypeSchema: z.ZodEnum<["main", "ai_languageModel", "ai_memory", "ai_tool"]>;
export interface WorkflowNode {
    id: string;
    name: string;
    type: string;
    typeVersion: number;
    position: {
        x: number;
        y: number;
    };
    parameters: Record<string, unknown>;
    credentials?: Record<string, string>;
    disabled?: boolean;
    onError?: 'stop' | 'continue';
    retryOnFail?: boolean;
    maxTries?: number;
    retryDelayMs?: number;
    timeoutMs?: number;
    notes?: string;
}
export declare const workflowNodeSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodString;
    typeVersion: z.ZodNumber;
    position: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
    }, {
        x: number;
        y: number;
    }>;
    parameters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    credentials: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    disabled: z.ZodOptional<z.ZodBoolean>;
    onError: z.ZodDefault<z.ZodOptional<z.ZodEnum<["stop", "continue"]>>>;
    retryOnFail: z.ZodOptional<z.ZodBoolean>;
    maxTries: z.ZodOptional<z.ZodNumber>;
    retryDelayMs: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    timeoutMs: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    type: string;
    id: string;
    typeVersion: number;
    position: {
        x: number;
        y: number;
    };
    parameters: Record<string, unknown>;
    onError: "stop" | "continue";
    retryDelayMs: number;
    timeoutMs: number;
    credentials?: Record<string, string> | undefined;
    disabled?: boolean | undefined;
    retryOnFail?: boolean | undefined;
    maxTries?: number | undefined;
    notes?: string | undefined;
}, {
    name: string;
    type: string;
    id: string;
    typeVersion: number;
    position: {
        x: number;
        y: number;
    };
    parameters?: Record<string, unknown> | undefined;
    credentials?: Record<string, string> | undefined;
    disabled?: boolean | undefined;
    onError?: "stop" | "continue" | undefined;
    retryOnFail?: boolean | undefined;
    maxTries?: number | undefined;
    retryDelayMs?: number | undefined;
    timeoutMs?: number | undefined;
    notes?: string | undefined;
}>;
export interface ConnectionTarget {
    node: string;
    type: ConnectionType;
    index: number;
}
export declare const connectionTargetSchema: z.ZodObject<{
    node: z.ZodString;
    type: z.ZodEnum<["main", "ai_languageModel", "ai_memory", "ai_tool"]>;
    index: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
    node: string;
    index: number;
}, {
    type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
    node: string;
    index: number;
}>;
export type Connections = Record<string, Partial<Record<ConnectionType, ConnectionTarget[][]>>>;
export declare const connectionsSchema: z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodEnum<["main", "ai_languageModel", "ai_memory", "ai_tool"]>, z.ZodArray<z.ZodArray<z.ZodObject<{
    node: z.ZodString;
    type: z.ZodEnum<["main", "ai_languageModel", "ai_memory", "ai_tool"]>;
    index: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
    node: string;
    index: number;
}, {
    type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
    node: string;
    index: number;
}>, "many">, "many">>>;
export interface Workflow {
    id: string;
    name: string;
    active: boolean;
    nodes: WorkflowNode[];
    connections: Connections;
    settings?: {
        timezone?: string;
        saveExecutionData?: boolean;
    };
}
export declare const workflowSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    active: z.ZodDefault<z.ZodBoolean>;
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodString;
        typeVersion: z.ZodNumber;
        position: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>;
        parameters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        credentials: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        disabled: z.ZodOptional<z.ZodBoolean>;
        onError: z.ZodDefault<z.ZodOptional<z.ZodEnum<["stop", "continue"]>>>;
        retryOnFail: z.ZodOptional<z.ZodBoolean>;
        maxTries: z.ZodOptional<z.ZodNumber>;
        retryDelayMs: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        timeoutMs: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        type: string;
        id: string;
        typeVersion: number;
        position: {
            x: number;
            y: number;
        };
        parameters: Record<string, unknown>;
        onError: "stop" | "continue";
        retryDelayMs: number;
        timeoutMs: number;
        credentials?: Record<string, string> | undefined;
        disabled?: boolean | undefined;
        retryOnFail?: boolean | undefined;
        maxTries?: number | undefined;
        notes?: string | undefined;
    }, {
        name: string;
        type: string;
        id: string;
        typeVersion: number;
        position: {
            x: number;
            y: number;
        };
        parameters?: Record<string, unknown> | undefined;
        credentials?: Record<string, string> | undefined;
        disabled?: boolean | undefined;
        onError?: "stop" | "continue" | undefined;
        retryOnFail?: boolean | undefined;
        maxTries?: number | undefined;
        retryDelayMs?: number | undefined;
        timeoutMs?: number | undefined;
        notes?: string | undefined;
    }>, "many">;
    connections: z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodEnum<["main", "ai_languageModel", "ai_memory", "ai_tool"]>, z.ZodArray<z.ZodArray<z.ZodObject<{
        node: z.ZodString;
        type: z.ZodEnum<["main", "ai_languageModel", "ai_memory", "ai_tool"]>;
        index: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
        node: string;
        index: number;
    }, {
        type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
        node: string;
        index: number;
    }>, "many">, "many">>>;
    settings: z.ZodOptional<z.ZodObject<{
        timezone: z.ZodOptional<z.ZodString>;
        saveExecutionData: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        timezone?: string | undefined;
        saveExecutionData?: boolean | undefined;
    }, {
        timezone?: string | undefined;
        saveExecutionData?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    active: boolean;
    nodes: {
        name: string;
        type: string;
        id: string;
        typeVersion: number;
        position: {
            x: number;
            y: number;
        };
        parameters: Record<string, unknown>;
        onError: "stop" | "continue";
        retryDelayMs: number;
        timeoutMs: number;
        credentials?: Record<string, string> | undefined;
        disabled?: boolean | undefined;
        retryOnFail?: boolean | undefined;
        maxTries?: number | undefined;
        notes?: string | undefined;
    }[];
    connections: Record<string, Partial<Record<"main" | "ai_languageModel" | "ai_memory" | "ai_tool", {
        type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
        node: string;
        index: number;
    }[][]>>>;
    settings?: {
        timezone?: string | undefined;
        saveExecutionData?: boolean | undefined;
    } | undefined;
}, {
    name: string;
    id: string;
    nodes: {
        name: string;
        type: string;
        id: string;
        typeVersion: number;
        position: {
            x: number;
            y: number;
        };
        parameters?: Record<string, unknown> | undefined;
        credentials?: Record<string, string> | undefined;
        disabled?: boolean | undefined;
        onError?: "stop" | "continue" | undefined;
        retryOnFail?: boolean | undefined;
        maxTries?: number | undefined;
        retryDelayMs?: number | undefined;
        timeoutMs?: number | undefined;
        notes?: string | undefined;
    }[];
    connections: Record<string, Partial<Record<"main" | "ai_languageModel" | "ai_memory" | "ai_tool", {
        type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
        node: string;
        index: number;
    }[][]>>>;
    active?: boolean | undefined;
    settings?: {
        timezone?: string | undefined;
        saveExecutionData?: boolean | undefined;
    } | undefined;
}>, {
    name: string;
    id: string;
    active: boolean;
    nodes: {
        name: string;
        type: string;
        id: string;
        typeVersion: number;
        position: {
            x: number;
            y: number;
        };
        parameters: Record<string, unknown>;
        onError: "stop" | "continue";
        retryDelayMs: number;
        timeoutMs: number;
        credentials?: Record<string, string> | undefined;
        disabled?: boolean | undefined;
        retryOnFail?: boolean | undefined;
        maxTries?: number | undefined;
        notes?: string | undefined;
    }[];
    connections: Record<string, Partial<Record<"main" | "ai_languageModel" | "ai_memory" | "ai_tool", {
        type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
        node: string;
        index: number;
    }[][]>>>;
    settings?: {
        timezone?: string | undefined;
        saveExecutionData?: boolean | undefined;
    } | undefined;
}, {
    name: string;
    id: string;
    nodes: {
        name: string;
        type: string;
        id: string;
        typeVersion: number;
        position: {
            x: number;
            y: number;
        };
        parameters?: Record<string, unknown> | undefined;
        credentials?: Record<string, string> | undefined;
        disabled?: boolean | undefined;
        onError?: "stop" | "continue" | undefined;
        retryOnFail?: boolean | undefined;
        maxTries?: number | undefined;
        retryDelayMs?: number | undefined;
        timeoutMs?: number | undefined;
        notes?: string | undefined;
    }[];
    connections: Record<string, Partial<Record<"main" | "ai_languageModel" | "ai_memory" | "ai_tool", {
        type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
        node: string;
        index: number;
    }[][]>>>;
    active?: boolean | undefined;
    settings?: {
        timezone?: string | undefined;
        saveExecutionData?: boolean | undefined;
    } | undefined;
}>, {
    name: string;
    id: string;
    active: boolean;
    nodes: {
        name: string;
        type: string;
        id: string;
        typeVersion: number;
        position: {
            x: number;
            y: number;
        };
        parameters: Record<string, unknown>;
        onError: "stop" | "continue";
        retryDelayMs: number;
        timeoutMs: number;
        credentials?: Record<string, string> | undefined;
        disabled?: boolean | undefined;
        retryOnFail?: boolean | undefined;
        maxTries?: number | undefined;
        notes?: string | undefined;
    }[];
    connections: Record<string, Partial<Record<"main" | "ai_languageModel" | "ai_memory" | "ai_tool", {
        type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
        node: string;
        index: number;
    }[][]>>>;
    settings?: {
        timezone?: string | undefined;
        saveExecutionData?: boolean | undefined;
    } | undefined;
}, {
    name: string;
    id: string;
    nodes: {
        name: string;
        type: string;
        id: string;
        typeVersion: number;
        position: {
            x: number;
            y: number;
        };
        parameters?: Record<string, unknown> | undefined;
        credentials?: Record<string, string> | undefined;
        disabled?: boolean | undefined;
        onError?: "stop" | "continue" | undefined;
        retryOnFail?: boolean | undefined;
        maxTries?: number | undefined;
        retryDelayMs?: number | undefined;
        timeoutMs?: number | undefined;
        notes?: string | undefined;
    }[];
    connections: Record<string, Partial<Record<"main" | "ai_languageModel" | "ai_memory" | "ai_tool", {
        type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
        node: string;
        index: number;
    }[][]>>>;
    active?: boolean | undefined;
    settings?: {
        timezone?: string | undefined;
        saveExecutionData?: boolean | undefined;
    } | undefined;
}>;
export interface Item {
    json: Record<string, unknown>;
}
export declare const itemSchema: z.ZodObject<{
    json: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    json: Record<string, unknown>;
}, {
    json: Record<string, unknown>;
}>;
//# sourceMappingURL=workflow.d.ts.map