import { z } from 'zod';

export type NodeErrorType =
  | 'validation'   // paramètre invalide ou manquant
  | 'config'       // credential ou sous-node manquant
  | 'auth'         // clé API ou identifiants refusés
  | 'rate_limit'
  | 'timeout'
  | 'network'
  | 'tool'         // un outil a échoué
  | 'unknown';

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
  constructor(
    message: string,                 // message utilisateur, en français
    public type: NodeErrorType,
    public opts?: { sourceNodeId?: string; cause?: unknown; details?: unknown },
  ) { 
    super(message);
    this.name = 'NodeError';
  }
}

export interface NodeErrorData {
  type: NodeErrorType;
  message: string;
  sourceNodeId?: string;
  details?: unknown;
}

export const nodeErrorDataSchema = z.object({
  type: nodeErrorTypeSchema,
  message: z.string().min(1),
  sourceNodeId: z.string().optional(),
  details: z.unknown().optional(),
});

// Erreurs API standardisées
export type ApiErrorCode = 
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation_error'
  | 'payload_too_large'
  | 'rate_limited'
  | 'internal_error';

export const apiErrorCodeSchema = z.enum([
  'unauthorized',
  'forbidden', 
  'not_found',
  'validation_error',
  'payload_too_large',
  'rate_limited',
  'internal_error'
]);

export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string().min(1),
    details: z.unknown().optional(),
  }),
});

export class AppError extends Error {
  constructor(
    public code: ApiErrorCode,
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}