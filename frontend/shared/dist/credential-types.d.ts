import { z } from 'zod';
export interface CredentialField {
    name: string;
    displayName: string;
    type: 'string' | 'password' | 'text' | 'number' | 'boolean' | 'options';
    required?: boolean;
    description?: string;
    placeholder?: string;
    options?: {
        value: string;
        label: string;
    }[];
    default?: unknown;
    min?: number;
    max?: number;
}
export declare const credentialFieldSchema: z.ZodObject<{
    name: z.ZodString;
    displayName: z.ZodString;
    type: z.ZodEnum<["string", "password", "text", "number", "boolean", "options"]>;
    required: z.ZodOptional<z.ZodBoolean>;
    description: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
    options: z.ZodOptional<z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: string;
        label: string;
    }, {
        value: string;
        label: string;
    }>, "many">>;
    default: z.ZodOptional<z.ZodUnknown>;
    min: z.ZodOptional<z.ZodNumber>;
    max: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    displayName: string;
    type: "string" | "number" | "boolean" | "password" | "text" | "options";
    options?: {
        value: string;
        label: string;
    }[] | undefined;
    required?: boolean | undefined;
    description?: string | undefined;
    placeholder?: string | undefined;
    default?: unknown;
    min?: number | undefined;
    max?: number | undefined;
}, {
    name: string;
    displayName: string;
    type: "string" | "number" | "boolean" | "password" | "text" | "options";
    options?: {
        value: string;
        label: string;
    }[] | undefined;
    required?: boolean | undefined;
    description?: string | undefined;
    placeholder?: string | undefined;
    default?: unknown;
    min?: number | undefined;
    max?: number | undefined;
}>;
export interface CredentialTypeDescription {
    type: string;
    displayName: string;
    description: string;
    icon: string;
    color?: string;
    fields: CredentialField[];
    documentationUrl?: string;
}
export declare const credentialTypeDescriptionSchema: z.ZodObject<{
    type: z.ZodString;
    displayName: z.ZodString;
    description: z.ZodString;
    icon: z.ZodString;
    color: z.ZodOptional<z.ZodString>;
    fields: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        displayName: z.ZodString;
        type: z.ZodEnum<["string", "password", "text", "number", "boolean", "options"]>;
        required: z.ZodOptional<z.ZodBoolean>;
        description: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            value: string;
            label: string;
        }, {
            value: string;
            label: string;
        }>, "many">>;
        default: z.ZodOptional<z.ZodUnknown>;
        min: z.ZodOptional<z.ZodNumber>;
        max: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        displayName: string;
        type: "string" | "number" | "boolean" | "password" | "text" | "options";
        options?: {
            value: string;
            label: string;
        }[] | undefined;
        required?: boolean | undefined;
        description?: string | undefined;
        placeholder?: string | undefined;
        default?: unknown;
        min?: number | undefined;
        max?: number | undefined;
    }, {
        name: string;
        displayName: string;
        type: "string" | "number" | "boolean" | "password" | "text" | "options";
        options?: {
            value: string;
            label: string;
        }[] | undefined;
        required?: boolean | undefined;
        description?: string | undefined;
        placeholder?: string | undefined;
        default?: unknown;
        min?: number | undefined;
        max?: number | undefined;
    }>, "many">;
    documentationUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    displayName: string;
    type: string;
    description: string;
    icon: string;
    fields: {
        name: string;
        displayName: string;
        type: "string" | "number" | "boolean" | "password" | "text" | "options";
        options?: {
            value: string;
            label: string;
        }[] | undefined;
        required?: boolean | undefined;
        description?: string | undefined;
        placeholder?: string | undefined;
        default?: unknown;
        min?: number | undefined;
        max?: number | undefined;
    }[];
    color?: string | undefined;
    documentationUrl?: string | undefined;
}, {
    displayName: string;
    type: string;
    description: string;
    icon: string;
    fields: {
        name: string;
        displayName: string;
        type: "string" | "number" | "boolean" | "password" | "text" | "options";
        options?: {
            value: string;
            label: string;
        }[] | undefined;
        required?: boolean | undefined;
        description?: string | undefined;
        placeholder?: string | undefined;
        default?: unknown;
        min?: number | undefined;
        max?: number | undefined;
    }[];
    color?: string | undefined;
    documentationUrl?: string | undefined;
}>;
export interface Credential {
    id: string;
    userId: string;
    name: string;
    type: string;
    hint: string;
    encryptedData: string;
    createdAt: Date;
}
export declare const credentialSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    name: z.ZodString;
    type: z.ZodString;
    hint: z.ZodString;
    encryptedData: z.ZodString;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    name: string;
    type: string;
    id: string;
    userId: string;
    hint: string;
    encryptedData: string;
    createdAt: Date;
}, {
    name: string;
    type: string;
    id: string;
    userId: string;
    hint: string;
    encryptedData: string;
    createdAt: Date;
}>;
export interface CreateCredentialInput {
    name: string;
    type: string;
    data: Record<string, unknown>;
}
export declare const createCredentialInputSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    name: string;
    type: string;
    data: Record<string, unknown>;
}, {
    name: string;
    type: string;
    data: Record<string, unknown>;
}>;
export interface TestCredentialInput {
    type: string;
    data: Record<string, unknown>;
}
export declare const testCredentialInputSchema: z.ZodObject<{
    type: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: string;
    data: Record<string, unknown>;
}, {
    type: string;
    data: Record<string, unknown>;
}>;
export interface CredentialListItem {
    id: string;
    name: string;
    type: string;
    hint: string;
    createdAt: Date;
}
export declare const credentialListItemSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodString;
    hint: z.ZodString;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    name: string;
    type: string;
    id: string;
    hint: string;
    createdAt: Date;
}, {
    name: string;
    type: string;
    id: string;
    hint: string;
    createdAt: Date;
}>;
//# sourceMappingURL=credential-types.d.ts.map