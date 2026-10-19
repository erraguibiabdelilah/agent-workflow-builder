import { z } from 'zod';
import { ConnectionType } from './workflow.js';
export type NodeKind = 'trigger' | 'regular' | 'subnode';
export type NodeCategory = 'trigger' | 'ai' | 'logic' | 'action' | 'tool' | 'model' | 'memory';
export declare const nodeKindSchema: z.ZodEnum<["trigger", "regular", "subnode"]>;
export declare const nodeCategorySchema: z.ZodEnum<["trigger", "ai", "logic", "action", "tool", "model", "memory"]>;
export interface InputPort {
    type: ConnectionType;
    displayName?: string;
    required?: boolean;
    maxConnections?: number;
}
export declare const inputPortSchema: z.ZodObject<{
    type: z.ZodEnum<["main", "ai_languageModel", "ai_memory", "ai_tool"]>;
    displayName: z.ZodOptional<z.ZodString>;
    required: z.ZodOptional<z.ZodBoolean>;
    maxConnections: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
    displayName?: string | undefined;
    required?: boolean | undefined;
    maxConnections?: number | undefined;
}, {
    type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
    displayName?: string | undefined;
    required?: boolean | undefined;
    maxConnections?: number | undefined;
}>;
export interface OutputPort {
    type: ConnectionType;
    displayName?: string;
}
export declare const outputPortSchema: z.ZodObject<{
    type: z.ZodEnum<["main", "ai_languageModel", "ai_memory", "ai_tool"]>;
    displayName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
    displayName?: string | undefined;
}, {
    type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
    displayName?: string | undefined;
}>;
export type PropertyType = 'string' | 'text' | 'number' | 'boolean' | 'options' | 'json' | 'credential' | 'list';
export declare const propertyTypeSchema: z.ZodEnum<["string", "text", "number", "boolean", "options", "json", "credential", "list"]>;
export interface NodeProperty {
    name: string;
    displayName: string;
    type: PropertyType;
    default?: unknown;
    required?: boolean;
    description?: string;
    placeholder?: string;
    options?: {
        value: string;
        label: string;
    }[];
    supportsExpressions?: boolean;
    credentialType?: string;
    itemFields?: NodeProperty[];
    showWhen?: {
        property: string;
        equals?: unknown;
    };
    min?: number;
    max?: number;
}
export declare const nodePropertySchema: z.ZodType<NodeProperty>;
export interface NodeTypeDescription {
    type: string;
    version: number;
    displayName: string;
    description: string;
    category: NodeCategory;
    kind: NodeKind;
    icon: string;
    color?: string;
    inputs: InputPort[];
    outputs: OutputPort[];
    properties: NodeProperty[];
    credentials?: {
        type: string;
        required: boolean;
    }[];
}
export declare const nodeTypeDescriptionSchema: z.ZodObject<{
    type: z.ZodString;
    version: z.ZodNumber;
    displayName: z.ZodString;
    description: z.ZodString;
    category: z.ZodEnum<["trigger", "ai", "logic", "action", "tool", "model", "memory"]>;
    kind: z.ZodEnum<["trigger", "regular", "subnode"]>;
    icon: z.ZodString;
    color: z.ZodOptional<z.ZodString>;
    inputs: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["main", "ai_languageModel", "ai_memory", "ai_tool"]>;
        displayName: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        maxConnections: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
        displayName?: string | undefined;
        required?: boolean | undefined;
        maxConnections?: number | undefined;
    }, {
        type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
        displayName?: string | undefined;
        required?: boolean | undefined;
        maxConnections?: number | undefined;
    }>, "many">;
    outputs: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["main", "ai_languageModel", "ai_memory", "ai_tool"]>;
        displayName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
        displayName?: string | undefined;
    }, {
        type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
        displayName?: string | undefined;
    }>, "many">;
    properties: z.ZodArray<z.ZodType<NodeProperty, z.ZodTypeDef, NodeProperty>, "many">;
    credentials: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        required: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        type: string;
        required: boolean;
    }, {
        type: string;
        required: boolean;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    type: string;
    displayName: string;
    version: number;
    description: string;
    category: "trigger" | "ai" | "logic" | "action" | "tool" | "model" | "memory";
    kind: "trigger" | "regular" | "subnode";
    icon: string;
    inputs: {
        type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
        displayName?: string | undefined;
        required?: boolean | undefined;
        maxConnections?: number | undefined;
    }[];
    outputs: {
        type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
        displayName?: string | undefined;
    }[];
    properties: NodeProperty[];
    color?: string | undefined;
    credentials?: {
        type: string;
        required: boolean;
    }[] | undefined;
}, {
    type: string;
    displayName: string;
    version: number;
    description: string;
    category: "trigger" | "ai" | "logic" | "action" | "tool" | "model" | "memory";
    kind: "trigger" | "regular" | "subnode";
    icon: string;
    inputs: {
        type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
        displayName?: string | undefined;
        required?: boolean | undefined;
        maxConnections?: number | undefined;
    }[];
    outputs: {
        type: "main" | "ai_languageModel" | "ai_memory" | "ai_tool";
        displayName?: string | undefined;
    }[];
    properties: NodeProperty[];
    color?: string | undefined;
    credentials?: {
        type: string;
        required: boolean;
    }[] | undefined;
}>;
//# sourceMappingURL=node-types.d.ts.map