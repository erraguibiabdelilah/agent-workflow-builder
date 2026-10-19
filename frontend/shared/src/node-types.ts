import { z } from 'zod';
import { ConnectionType } from './workflow.js';

export type NodeKind = 'trigger' | 'regular' | 'subnode';
export type NodeCategory = 'trigger' | 'ai' | 'logic' | 'action' | 'tool' | 'model' | 'memory';

export const nodeKindSchema = z.enum(['trigger', 'regular', 'subnode']);
export const nodeCategorySchema = z.enum(['trigger', 'ai', 'logic', 'action', 'tool', 'model', 'memory']);

export interface InputPort {
  type: ConnectionType;
  displayName?: string;
  required?: boolean;
  maxConnections?: number;          // 1 pour le Chat Model, illimité si absent
}

export const inputPortSchema = z.object({
  type: z.enum(['main', 'ai_languageModel', 'ai_memory', 'ai_tool']),
  displayName: z.string().optional(),
  required: z.boolean().optional(),
  maxConnections: z.number().int().positive().optional(),
});

export interface OutputPort { 
  type: ConnectionType; 
  displayName?: string; 
} // 'true' / 'false' pour if

export const outputPortSchema = z.object({
  type: z.enum(['main', 'ai_languageModel', 'ai_memory', 'ai_tool']),
  displayName: z.string().optional(),
});

export type PropertyType =
  | 'string' | 'text'               // text = multiligne
  | 'number' | 'boolean'
  | 'options'                       // liste déroulante
  | 'json'
  | 'credential'                    // sélecteur de credential + création à la volée
  | 'list';                         // liste d'objets, décrits par itemFields

export const propertyTypeSchema = z.enum(['string', 'text', 'number', 'boolean', 'options', 'json', 'credential', 'list']);

export interface NodeProperty {
  name: string;
  displayName: string;
  type: PropertyType;
  default?: unknown;
  required?: boolean;
  description?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  supportsExpressions?: boolean;    // affiche l'aide « {{ }} » et l'autocomplétion de variables
  credentialType?: string;          // pour type 'credential'
  itemFields?: NodeProperty[];      // pour type 'list'
  showWhen?: { property: string; equals?: unknown };
  min?: number; 
  max?: number;
}

export const nodePropertySchema: z.ZodType<NodeProperty> = z.lazy(() => z.object({
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

export interface NodeTypeDescription {
  type: string;                     // identifiant unique, ex. 'agent'
  version: number;
  displayName: string;
  description: string;
  category: NodeCategory;
  kind: NodeKind;
  icon: string;                     // nom d'icône lucide
  subtitle?: string;
  color?: string;
  inputs: InputPort[];
  outputs: OutputPort[];
  properties: NodeProperty[];
  credentials?: { type: string; required: boolean }[];
}

export const nodeTypeDescriptionSchema = z.object({
  type: z.string().min(1),
  version: z.number().int().positive(),
  displayName: z.string().min(1),
  description: z.string().min(1),
  category: nodeCategorySchema,
  kind: nodeKindSchema,
  icon: z.string().min(1),
  subtitle: z.string().optional(),
  color: z.string().optional(),
  inputs: z.array(inputPortSchema),
  outputs: z.array(outputPortSchema),
  properties: z.array(nodePropertySchema),
  credentials: z.array(z.object({
    type: z.string(),
    required: z.boolean(),
  })).optional(),
});
