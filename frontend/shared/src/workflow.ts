import { z } from 'zod';

export type ConnectionType = 'main' | 'ai_languageModel' | 'ai_memory' | 'ai_tool';

export const connectionTypeSchema = z.enum(['main', 'ai_languageModel', 'ai_memory', 'ai_tool']);

export interface WorkflowNode {
  id: string;                       // uuid, stable
  name: string;                     // unique dans le workflow, utilisé par les expressions et les connexions
  type: string;                     // ex. 'agent', 'telegramTrigger'
  typeVersion: number;
  position: { x: number; y: number };
  parameters: Record<string, unknown>;
  credentials?: Record<string, string>;  // { credentialType: credentialId }
  disabled?: boolean;
  onError?: 'stop' | 'continue';    // défaut 'stop'
  retryOnFail?: boolean;
  maxTries?: number;                // 1 à 3
  retryDelayMs?: number;            // défaut 1000
  timeoutMs?: number;               // défaut 60000
  notes?: string;
}

export const workflowNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  typeVersion: z.number().int().positive(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  parameters: z.record(z.unknown()).default({}),
  credentials: z.record(z.string()).optional(),
  disabled: z.boolean().optional(),
  onError: z.enum(['stop', 'continue']).optional().default('stop'),
  retryOnFail: z.boolean().optional(),
  maxTries: z.number().int().min(1).max(3).optional(),
  retryDelayMs: z.number().int().positive().optional().default(1000),
  timeoutMs: z.number().int().positive().optional().default(60000),
  notes: z.string().optional(),
});

export interface ConnectionTarget {
  node: string;                     // NOM du node cible
  type: ConnectionType;
  index: number;                    // index de l'entrée du node cible
}

export const connectionTargetSchema = z.object({
  node: z.string().min(1),
  type: connectionTypeSchema,
  index: z.number().int().min(0),
});

// connections[nomNodeSource][typeConnexion][indexSortie] = liste de cibles
export type Connections = Record<
  string,
  Partial<Record<ConnectionType, ConnectionTarget[][]>>
>;

export const connectionsSchema = z.record(
  z.string(),
  z.record(connectionTypeSchema, z.array(z.array(connectionTargetSchema)))
);

export interface Workflow {
  id: string;
  name: string;
  active: boolean;
  nodes: WorkflowNode[];
  connections: Connections;
  settings?: { timezone?: string; saveExecutionData?: boolean };
}

export const workflowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  active: z.boolean().default(false),
  nodes: z.array(workflowNodeSchema),
  connections: connectionsSchema,
  settings: z.object({
    timezone: z.string().optional(),
    saveExecutionData: z.boolean().optional(),
  }).optional(),
})
.refine((workflow) => {
  // Vérifier que les noms de nodes sont uniques
  const names = workflow.nodes.map(node => node.name);
  return new Set(names).size === names.length;
}, {
  message: "Les noms des nodes doivent être uniques",
  path: ["nodes"],
})
.refine((workflow) => {
  // Vérifier que toutes les connexions référencent des nodes existants
  const nodeNames = new Set(workflow.nodes.map(node => node.name));
  
  for (const [sourceName, sourceConnections] of Object.entries(workflow.connections)) {
    if (!nodeNames.has(sourceName)) {
      return false;
    }
    
    for (const connectionType of Object.keys(sourceConnections)) {
      const connectionArray = sourceConnections[connectionType as ConnectionType];
      if (connectionArray) {
        for (const outputConnections of connectionArray) {
          for (const target of outputConnections) {
            if (!nodeNames.has(target.node)) {
              return false;
            }
          }
        }
      }
    }
  }
  
  return true;
}, {
  message: "Toutes les connexions doivent référencer des nodes existants",
  path: ["connections"],
});

export interface Item { 
  json: Record<string, unknown>; 
}

export const itemSchema = z.object({
  json: z.record(z.unknown()),
});