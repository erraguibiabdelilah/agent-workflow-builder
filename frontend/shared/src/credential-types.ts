import { z } from 'zod';

export interface CredentialField {
  name: string;
  displayName: string;
  type: 'string' | 'password' | 'text' | 'number' | 'boolean' | 'options';
  required?: boolean;
  description?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  default?: unknown;
  min?: number;
  max?: number;
}

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

export interface CredentialTypeDescription {
  type: string;                     // identifiant unique, ex. 'anthropicApi'
  displayName: string;
  description: string;
  icon: string;                     // nom d'icône lucide
  color?: string;
  fields: CredentialField[];
  documentationUrl?: string;
}

export const credentialTypeDescriptionSchema = z.object({
  type: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
  color: z.string().optional(),
  fields: z.array(credentialFieldSchema),
  documentationUrl: z.string().url().optional(),
});

export interface Credential {
  id: string;
  userId: string;
  name: string;
  type: string;
  hint: string;                     // version masquée du secret principal (ex. "sk-...a3f9")
  encryptedData: string;           // données chiffrées AES-256-GCM
  createdAt: Date;
}

export const credentialSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  hint: z.string(),
  encryptedData: z.string().min(1),
  createdAt: z.date(),
});

export interface CreateCredentialInput {
  name: string;
  type: string;
  data: Record<string, unknown>;   // données en clair à chiffrer
}

export const createCredentialInputSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  data: z.record(z.unknown()),
});

export interface TestCredentialInput {
  type: string;
  data: Record<string, unknown>;   // données de test (pas forcément stockées)
}

export const testCredentialInputSchema = z.object({
  type: z.string().min(1),
  data: z.record(z.unknown()),
});

export interface CredentialListItem {
  id: string;
  name: string;
  type: string;
  hint: string;
  createdAt: Date;
}

export const credentialListItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  hint: z.string(),
  createdAt: z.date(),
});