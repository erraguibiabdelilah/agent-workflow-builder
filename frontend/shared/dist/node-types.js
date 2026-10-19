import { z } from 'zod';
export const nodeKindSchema = z.enum(['trigger', 'regular', 'subnode']);
export const nodeCategorySchema = z.enum(['trigger', 'ai', 'logic', 'action', 'tool', 'model', 'memory']);
export const inputPortSchema = z.object({
    type: z.enum(['main', 'ai_languageModel', 'ai_memory', 'ai_tool']),
    displayName: z.string().optional(),
    required: z.boolean().optional(),
    maxConnections: z.number().int().positive().optional(),
});
export const outputPortSchema = z.object({
    type: z.enum(['main', 'ai_languageModel', 'ai_memory', 'ai_tool']),
    displayName: z.string().optional(),
});
export const propertyTypeSchema = z.enum(['string', 'text', 'number', 'boolean', 'options', 'json', 'credential', 'list']);
export const nodePropertySchema = z.lazy(() => z.object({
    name: z.string().min(1),
    displayName: z.string().min(1),
    type: propertyTypeSchema,
    default: z.unknown().optional(),
    required: z.boolean().optional(),
    description: z.string().optional(),
    placeholder: z.string().optional(),
    options: z.array(z.object({
        value: z.string(),
        label: z.string(),
    })).optional(),
    supportsExpressions: z.boolean().optional(),
    credentialType: z.string().optional(),
    itemFields: z.array(nodePropertySchema).optional(),
    showWhen: z.object({
        property: z.string(),
        equals: z.unknown(),
    }).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
}));
export const nodeTypeDescriptionSchema = z.object({
    type: z.string().min(1),
    version: z.number().int().positive(),
    displayName: z.string().min(1),
    description: z.string().min(1),
    category: nodeCategorySchema,
    kind: nodeKindSchema,
    icon: z.string().min(1),
    color: z.string().optional(),
    inputs: z.array(inputPortSchema),
    outputs: z.array(outputPortSchema),
    properties: z.array(nodePropertySchema),
    credentials: z.array(z.object({
        type: z.string(),
        required: z.boolean(),
    })).optional(),
});
//# sourceMappingURL=node-types.js.map