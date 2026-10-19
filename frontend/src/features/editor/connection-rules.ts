import type { Connection } from '@xyflow/react';
import type { NodeTypeDescription } from '../../../shared/src/node-types';
import type { ConnectionType } from '../../../shared/src/workflow';
import type { WorkflowFlowEdge, WorkflowFlowNode } from './serialization';

export type ConnectionValidation = { ok: true } | { ok: false; reason: string };

interface ParsedHandle {
  type: ConnectionType;
  index: number;
}

const CONNECTION_TYPES: ConnectionType[] = ['main', 'ai_languageModel', 'ai_memory', 'ai_tool'];

/** Checks the complete node/handle rules and returns a short user-facing rejection reason. */
export function isValidConnection(
  connection: Connection,
  nodes: WorkflowFlowNode[],
  edges: WorkflowFlowEdge[],
  nodeTypes: NodeTypeDescription[],
): ConnectionValidation {
  if (!connection.source || !connection.target) return reject('Choisissez un handle de départ et un handle d’arrivée.');
  if (connection.source === connection.target) return reject('Un node ne peut pas être connecté à lui-même.');

  const source = nodes.find((node) => node.id === connection.source);
  const target = nodes.find((node) => node.id === connection.target);
  if (!source || !target) return reject('Le node connecté est introuvable.');

  const sourceDescription = nodeTypes.find((description) => description.type === source.data.type);
  const targetDescription = nodeTypes.find((description) => description.type === target.data.type);
  if (!sourceDescription || !targetDescription) return reject('Un type de node inconnu ne peut pas être connecté.');

  const sourceHandle = parseHandle(connection.sourceHandle);
  const targetHandle = parseHandle(connection.targetHandle);
  if (!sourceHandle || !targetHandle) return reject('Sélectionnez des handles de connexion valides.');
  if (sourceHandle.type !== targetHandle.type) {
    return reject('Les handles doivent avoir le même type de connexion.');
  }

  const outputIndex = indexOfPort(sourceDescription.outputs, sourceHandle.type, sourceHandle.index);
  if (outputIndex < 0) return reject('Ce handle de sortie n’existe pas sur le node source.');
  const inputIndex = indexOfPort(targetDescription.inputs, targetHandle.type, targetHandle.index);
  if (inputIndex < 0) return reject('Ce handle d’entrée n’existe pas sur le node cible.');

  if (targetDescription.kind === 'trigger') {
    return reject('Un trigger ne peut pas recevoir de connexion.');
  }

  const alreadyConnected = edges.some((edge) =>
    edge.source === connection.source
    && edge.target === connection.target
    && edge.sourceHandle === connection.sourceHandle
    && edge.targetHandle === connection.targetHandle,
  );
  if (alreadyConnected) return reject('Cette connexion existe déjà.');

  const targetInput = targetDescription.inputs[inputIndex];
  if (targetInput.maxConnections !== undefined) {
    const count = edges.filter((edge) =>
      edge.target === target.id && edge.targetHandle === connection.targetHandle,
    ).length;
    if (count >= targetInput.maxConnections) {
      const label = targetInput.displayName ?? 'Cette entrée';
      return reject(`${label} accepte au maximum ${targetInput.maxConnections} connexion${targetInput.maxConnections === 1 ? '' : 's'}.`);
    }
  }

  if (sourceHandle.type === 'main' && createsMainCycle(connection.source, connection.target, edges)) {
    return reject('Cette connexion créerait une boucle dans le workflow.');
  }

  return { ok: true };
}

function reject(reason: string): ConnectionValidation {
  return { ok: false, reason };
}

function parseHandle(handle: string | null | undefined): ParsedHandle | undefined {
  if (!handle) return undefined;
  const separator = handle.lastIndexOf(':');
  if (separator < 1) return undefined;
  const type = handle.slice(0, separator) as ConnectionType;
  const index = Number(handle.slice(separator + 1));
  if (!CONNECTION_TYPES.includes(type) || !Number.isInteger(index) || index < 0) return undefined;
  return { type, index };
}

function indexOfPort(
  ports: Array<{ type: ConnectionType }>,
  type: ConnectionType,
  desiredIndex: number,
): number {
  let index = 0;
  for (let portIndex = 0; portIndex < ports.length; portIndex += 1) {
    if (ports[portIndex].type !== type) continue;
    if (index === desiredIndex) return portIndex;
    index += 1;
  }
  return -1;
}

function createsMainCycle(sourceId: string, targetId: string, edges: WorkflowFlowEdge[]): boolean {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if ((edge.data?.connectionType ?? parseHandle(edge.sourceHandle)?.type) !== 'main') continue;
    const targets = adjacency.get(edge.source) ?? [];
    targets.push(edge.target);
    adjacency.set(edge.source, targets);
  }

  const visited = new Set<string>();
  const stack = [targetId];
  while (stack.length) {
    const current = stack.pop()!;
    if (current === sourceId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    stack.push(...(adjacency.get(current) ?? []));
  }
  return false;
}
