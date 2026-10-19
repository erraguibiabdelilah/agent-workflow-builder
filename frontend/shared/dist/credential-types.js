import { z } from 'zod';
export const credentialFieldSchema = z.object({
    name: z.string().min(1),
    displayName: z.string().min(1),
    type: z.enum(['string', 'password', 'text', 'number', 'boolean', 'options']),
    required: z.boolean().optional(),
    description: z.string().optional(),
    placeholder: z.string().optional(),
    options: z.array(z.object({
        value: z.string(),
        label: z.string(),
    })).optional(),
    default: z.unknown().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
});
export const credentialTypeDescriptionSchema = z.object({
    type: z.string().min(1),
    displayName: z.string().min(1),
    description: z.string().min(1),
    icon: z.string().min(1),
    color: z.string().optional(),
    fields: z.array(credentialFieldSchema),
    documentationUrl: z.string().url().optional(),
});
export const credentialSchema = z.object({
    id: z.string().min(1),
    userId: z.string().min(1),
    name: z.string().min(1),
    type: z.string().min(1),
    hint: z.string(),
    encryptedData: z.string().min(1),
    createdAt: z.date(),
});
export const createCredentialInputSchema = z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    data: z.record(z.unknown()),
});
export const testCredentialInputSchema = z.object({
    type: z.string().min(1),
    data: z.record(z.unknown()),
});
export const credentialListItemSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: z.string().min(1),
    hint: z.string(),
    createdAt: z.date(),
});
//# sourceMappingURL=credential-types.js.map