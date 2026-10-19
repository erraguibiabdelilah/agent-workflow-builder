import type { Edge, Node as FlowNode } from '@xyflow/react';
import type { ConnectionTarget, ConnectionType, Connections, Workflow, WorkflowNode } from '../../../shared/src/workflow';
import type { NodeTypeDescription } from '../../../shared/src/node-types';

export interface WorkflowFlowNodeData extends Record<string, unknown> {
  name: string;
  type: string;
  subtitle?: string;
  parameters: Record<string, unknown>;
  outputCounts?: Partial<Record<ConnectionType, number>>;
  unknownInputHandles?: { type: ConnectionType; index: number }[];
  unknownOutputHandles?: { type: ConnectionType; index: number }[];
  workflowNode: WorkflowNode;
}

export interface WorkflowEdgeData extends Record<string, unknown> {
  connectionType: ConnectionType;
  outputIndex: number;
  inputIndex: number;
}

export type WorkflowFlowNode = FlowNode<WorkflowFlowNodeData>;
export type WorkflowFlowEdge = Edge<WorkflowEdgeData>;

const CONNECTION_TYPES: ConnectionType[] = ['main', 'ai_languageModel', 'ai_memory', 'ai_tool'];

export function resolveVisualType(description?: NodeTypeDescription): string {
  if (!description) return 'unknown';
  if (description.kind === 'trigger') return 'trigger';
  if (description.kind === 'subnode') return 'subnode';
  if (description.inputs.some((input) => input.type.startsWith('ai_'))) return 'agent';
  return 'regular';
}

export function resolveSubtitle(description: NodeTypeDescription | undefined, parameters: Record<string, unknown>): string | undefined {
  if (!description?.subtitle) return undefined;
  let missingValue = false;
  const subtitle = description.subtitle.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) => {
    const value = parameters[key];
    if (value === undefined || value === null || value === '') {
      missingValue = true;
      return '';
    }
    return String(value);
  }).trim();
  return missingValue || !subtitle ? undefined : subtitle;
}

export function workflowToFlow(
  workflow: Workflow,
  nodeTypes: NodeTypeDescription[],
): { nodes: WorkflowFlowNode[]; edges: WorkflowFlowEdge[] } {
  const descriptions = new Map(nodeTypes.map((description) => [description.type, description]));
  const nodeIdsByName = new Map(workflow.nodes.map((node) => [node.name, node.id]));

  const nodes = workflow.nodes.map((node): WorkflowFlowNode => {
    const description = descriptions.get(node.type);
    const outputCounts: Partial<Record<ConnectionType, number>> = {};
    description?.outputs.forEach((output) => {
      outputCounts[output.type] = (outputCounts[output.type] ?? 0) + 1;
    });
    return {
      id: node.id,
      type: resolveVisualType(description),
      position: { ...node.position },
      data: {
        name: node.name,
        type: node.type,
        subtitle: resolveSubtitle(description, node.parameters),
        parameters: { ...node.parameters },
        outputCounts,
        ...(!description ? { ...unknownHandles(node, workflow) } : {}),
        workflowNode: structuredClone(node),
        ...(description ? {} : { unknown: true }),
      },
    };
  });

  const edges: WorkflowFlowEdge[] = [];
  for (const [sourceName, typedConnections] of Object.entries(workflow.connections)) {
    const sourceId = nodeIdsByName.get(sourceName);
    if (!sourceId) continue;

    for (const [connectionType, outputConnections] of Object.entries(typedConnections)) {
      if (!outputConnections) continue;
      const type = connectionType as ConnectionType;
      outputConnections.forEach((targets, outputIndex) => {
        targets.forEach((target, targetOffset) => {
          const targetId = nodeIdsByName.get(target.node);
          if (!targetId) return;
          const edgeId = `${sourceId}:${type}:${outputIndex}->${targetId}:${target.type}:${target.index}:${targetOffset}`;
          edges.push({
            id: edgeId,
            source: sourceId,
            target: targetId,
            sourceHandle: `${type}:${outputIndex}`,
            targetHandle: `${target.type}:${target.index}`,
            type: 'workflow',
            data: { connectionType: type, outputIndex, inputIndex: target.index },
          });
        });
      });
    }
  }

  return { nodes, edges };
}

function unknownHandles(node: WorkflowNode, workflow: Workflow): Pick<WorkflowFlowNodeData, 'unknownInputHandles' | 'unknownOutputHandles'> {
  const inputHandles = new Map<string, { type: ConnectionType; index: number }>();
  const outputHandles = new Map<string, { type: ConnectionType; index: number }>();

  for (const [sourceName, typedConnections] of Object.entries(workflow.connections)) {
    for (const [typeName, outputConnections] of Object.entries(typedConnections)) {
      if (!outputConnections) continue;
      const type = typeName as ConnectionType;
      if (sourceName === node.name) {
        outputConnections.forEach((_, index) => outputHandles.set(`${type}:${index}`, { type, index }));
      }
      for (const targets of outputConnections) {
        for (const target of targets) {
          if (target.node === node.name) inputHandles.set(`${target.type}:${target.index}`, { type: target.type, index: target.index });
        }
      }
    }
  }

  return {
    unknownInputHandles: [...inputHandles.values()],
    unknownOutputHandles: [...outputHandles.values()],
  };
}

export function flowToWorkflow(
  nodes: WorkflowFlowNode[],
  edges: WorkflowFlowEdge[],
  base: Workflow,
): Workflow {
  const workflowNodes = nodes.map((flowNode): WorkflowNode => {
    const original = flowNode.data.workflowNode;
    return {
      ...structuredClone(original),
      id: flowNode.id,
      name: flowNode.data.name,
      type: flowNode.data.type,
      position: { ...flowNode.position },
      parameters: { ...flowNode.data.parameters },
    };
  });
  const namesById = new Map(workflowNodes.map((node) => [node.id, node.name]));
  const accumulated: Record<string, Partial<Record<ConnectionType, Map<number, ConnectionTarget[]>>>> = {};

  const ensureOutputMap = (sourceName: string, type: ConnectionType) => {
    const source = accumulated[sourceName] ?? (accumulated[sourceName] = {});
    return source[type] ?? (source[type] = new Map<number, ConnectionTarget[]>());
  };

  for (const [sourceName, typedOutputs] of Object.entries(base.connections)) {
    if (!workflowNodes.some((node) => node.name === sourceName)) continue;
    for (const [type, outputs] of Object.entries(typedOutputs)) {
      if (!outputs) continue;
      const outputMap = ensureOutputMap(sourceName, type as ConnectionType);
      outputs.forEach((_, index) => {
        if (!outputMap.has(index)) outputMap.set(index, []);
      });
    }
  }

  for (const edge of edges) {
    const sourceName = namesById.get(edge.source);
    const targetName = namesById.get(edge.target);
    if (!sourceName || !targetName) continue;

    const sourceHandle = parseHandle(edge.sourceHandle);
    const targetHandle = parseHandle(edge.targetHandle);
    const type = edge.data?.connectionType ?? sourceHandle?.type ?? targetHandle?.type ?? 'main';
    const outputIndex = edge.data?.outputIndex ?? sourceHandle?.index ?? 0;
    const inputIndex = edge.data?.inputIndex ?? targetHandle?.index ?? 0;
    if (!CONNECTION_TYPES.includes(type)) continue;

    const outputMap = ensureOutputMap(sourceName, type);
    const targets = outputMap.get(outputIndex) ?? [];
    targets.push({ node: targetName, type, index: inputIndex });
    outputMap.set(outputIndex, targets);
  }

  for (const flowNode of nodes) {
    const sourceName = flowNode.data.name;
    for (const [type, count] of Object.entries(flowNode.data.outputCounts ?? {})) {
      const outputMap = accumulated[sourceName]?.[type as ConnectionType];
      if (!outputMap) continue;
      for (let index = 0; index < (count ?? 0); index += 1) {
        if (!outputMap.has(index)) outputMap.set(index, []);
      }
    }
  }

  const connections: Connections = {};
  for (const [sourceName, typedOutputs] of Object.entries(accumulated)) {
    const outputObject: Partial<Record<ConnectionType, ConnectionTarget[][]>> = {};
    for (const [type, outputMap] of Object.entries(typedOutputs)) {
      if (!outputMap) continue;
      const lastIndex = Math.max(-1, ...outputMap.keys());
      outputObject[type as ConnectionType] = Array.from({ length: lastIndex + 1 }, (_, index) => [
        ...(outputMap.get(index) ?? []),
      ]);
    }
    connections[sourceName] = outputObject;
  }

  return {
    ...base,
    nodes: workflowNodes,
    connections,
  };
}

function parseHandle(handle?: string | null): { type: ConnectionType; index: number } | undefined {
  if (!handle) return undefined;
  const separator = handle.lastIndexOf(':');
  if (separator < 1) return undefined;
  const type = handle.slice(0, separator) as ConnectionType;
  const index = Number(handle.slice(separator + 1));
  if (!CONNECTION_TYPES.includes(type) || !Number.isInteger(index) || index < 0) return undefined;
  return { type, index };
}
