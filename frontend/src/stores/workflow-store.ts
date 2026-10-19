import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange } from '@xyflow/react';
import { create } from 'zustand';
import { renameNodeInWorkflow, uniqueName } from '../../shared/src/graph-utils';
import type { ValidationIssue } from '../../shared/src/validate-workflow';
import type { NodeTypeDescription } from '../../shared/src/node-types';
import type { ConnectionType, Workflow as WorkflowDefinition, WorkflowNode } from '../../shared/src/workflow';
import { workflows } from '../lib/api';
import {
  flowToWorkflow,
  resolveSubtitle,
  resolveVisualType,
  workflowToFlow,
  type WorkflowFlowEdge,
  type WorkflowFlowNode,
} from '../features/editor/serialization';

export type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error';
export type PaletteFilterMode = 'accept-output' | 'accept-input' | 'trigger';

export interface PaletteRequest {
  handleType?: ConnectionType;
  mode?: PaletteFilterMode;
  sourceNodeId?: string;
  sourceHandleId?: string;
  targetNodeId?: string;
  targetHandleId?: string;
  placement?: 'below-target' | 'after-source';
}

interface WorkflowState {
  workflow: WorkflowDefinition | null;
  nodeTypes: NodeTypeDescription[];
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
  dirty: boolean;
  saveStatus: SaveStatus;
  selectedNodeId: string | null;
  validationIssues: ValidationIssue[];
  paletteRequest: PaletteRequest | null;
  setWorkflow: (workflow: WorkflowDefinition, nodeTypes: NodeTypeDescription[]) => void;
  setValidationIssues: (issues: ValidationIssue[]) => void;
  selectNode: (nodeId: string | null) => void;
  openPalette: (request?: PaletteRequest) => void;
  closePalette: () => void;
  onNodesChange: (changes: NodeChange<WorkflowFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowFlowEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: string, position: { x: number; y: number }) => string | null;
  updateNodeParams: (nodeId: string, parameters: Record<string, unknown>) => void;
  updateNodeSettings: (nodeId: string, settings: Partial<WorkflowNode>) => void;
  updateNodeCredential: (nodeId: string, credentialType: string, credentialId: string) => void;
  removeNode: (nodeId: string) => void;
  renameNode: (nodeId: string, name: string) => void;
  updateWorkflowName: (name: string) => void;
  save: () => Promise<void>;
}

function defaultParameters(description: NodeTypeDescription): Record<string, unknown> {
  return Object.fromEntries(
    description.properties
      .filter((property) => property.default !== undefined)
      .map((property) => [property.name, structuredClone(property.default)]),
  );
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function markDirty(): Pick<WorkflowState, 'dirty' | 'saveStatus'> {
  return { dirty: true, saveStatus: 'dirty' };
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflow: null,
  nodeTypes: [],
  nodes: [],
  edges: [],
  dirty: false,
  saveStatus: 'saved',
  selectedNodeId: null,
  validationIssues: [],
  paletteRequest: null,

  setWorkflow: (workflow, nodeTypes) => {
    const flow = workflowToFlow(workflow, nodeTypes);
    set({
      workflow: structuredClone(workflow),
      nodeTypes,
      nodes: flow.nodes,
      edges: flow.edges,
      dirty: false,
      saveStatus: 'saved',
      selectedNodeId: null,
      validationIssues: [],
      paletteRequest: null,
    });
  },

  setValidationIssues: (validationIssues) => set({ validationIssues }),
  selectNode: (selectedNodeId) => set({ selectedNodeId }),
  openPalette: (paletteRequest = {}) => set({ paletteRequest }),
  closePalette: () => set({ paletteRequest: null }),

  onNodesChange: (changes) => {
    const removedNodeIds = new Set(changes.flatMap((change) => change.type === 'remove' ? [change.id] : []));
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
      edges: removedNodeIds.size
        ? state.edges.filter((edge) => !removedNodeIds.has(edge.source) && !removedNodeIds.has(edge.target))
        : state.edges,
      ...(removedNodeIds.has(state.selectedNodeId ?? '') ? { selectedNodeId: null } : {}),
      ...(changes.some((change) => change.type !== 'select' && change.type !== 'dimensions') ? markDirty() : {}),
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
      ...(changes.some((change) => change.type !== 'select') ? markDirty() : {}),
    }));
  },

  onConnect: (connection) => {
    if (!connection.source || !connection.target) return;
    const [sourceType, outputIndexValue] = (connection.sourceHandle ?? 'main:0').split(':');
    const [targetType, inputIndexValue] = (connection.targetHandle ?? 'main:0').split(':');
    const outputIndex = Number(outputIndexValue) || 0;
    const inputIndex = Number(inputIndexValue) || 0;
    const type = sourceType as ConnectionType;
    const newEdge: WorkflowFlowEdge = {
      id: `${connection.source}:${sourceType}:${outputIndex}->${connection.target}:${targetType}:${inputIndex}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: 'workflow',
      data: { connectionType: type, outputIndex, inputIndex },
    };
    set((state) => ({ edges: addEdge(newEdge, state.edges), ...markDirty() }));
  },

  addNode: (type, position) => {
    const state = get();
    const description = state.nodeTypes.find((item) => item.type === type);
    if (!description || !state.workflow) return null;

    const name = uniqueName(description.displayName, state.nodes.map((node) => node.data.name));
    const workflowNode: WorkflowNode = {
      id: newId(),
      name,
      type: description.type,
      typeVersion: description.version,
      position,
      parameters: defaultParameters(description),
    };
    const outputCounts: Partial<Record<'main' | 'ai_languageModel' | 'ai_memory' | 'ai_tool', number>> = {};
    description.outputs.forEach((output) => {
      outputCounts[output.type] = (outputCounts[output.type] ?? 0) + 1;
    });
    const flowNode: WorkflowFlowNode = {
      id: workflowNode.id,
      type: resolveVisualType(description),
      position,
      data: { name, type: description.type, subtitle: resolveSubtitle(description, workflowNode.parameters), parameters: workflowNode.parameters, outputCounts, workflowNode },
    };
    set((current) => ({ nodes: [...current.nodes, flowNode], selectedNodeId: flowNode.id, ...markDirty() }));
    return flowNode.id;
  },

  updateNodeParams: (nodeId, parameters) => {
    set((state) => ({
      nodes: state.nodes.map((node) => node.id === nodeId
        ? {
          ...node,
          data: {
            ...node.data,
            subtitle: resolveSubtitle(state.nodeTypes.find((description) => description.type === node.data.type), parameters),
            parameters: structuredClone(parameters),
            workflowNode: { ...node.data.workflowNode, parameters: structuredClone(parameters) },
          },
        }
        : node),
      ...markDirty(),
    }));
  },

  updateNodeSettings: (nodeId, settings) => {
    set((state) => ({
      nodes: state.nodes.map((node) => node.id === nodeId
        ? { ...node, data: { ...node.data, workflowNode: { ...node.data.workflowNode, ...settings } } }
        : node),
      ...markDirty(),
    }));
  },

  updateNodeCredential: (nodeId, credentialType, credentialId) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId) return node;
        const credentials = { ...(node.data.workflowNode.credentials ?? {}) };
        if (credentialId) credentials[credentialType] = credentialId;
        else delete credentials[credentialType];
        return { ...node, data: { ...node.data, workflowNode: { ...node.data.workflowNode, credentials } } };
      }),
      ...markDirty(),
    }));
  },

  removeNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      ...markDirty(),
    }));
  },

  renameNode: (nodeId, name) => {
    const state = get();
    const selected = state.nodes.find((node) => node.id === nodeId);
    if (!selected || !state.workflow) return;
    const normalized = name.trim();
    if (!normalized || state.nodes.some((node) => node.id !== nodeId && node.data.name === normalized)) {
      throw new Error('Le nom du node est vide ou déjà utilisé');
    }
    const definition = flowToWorkflow(state.nodes, state.edges, state.workflow);
    const renamed = renameNodeInWorkflow(definition, selected.data.name, normalized);
    const flow = workflowToFlow(renamed, state.nodeTypes);
    set({ workflow: renamed, nodes: flow.nodes, edges: flow.edges, ...markDirty() });
  },

  updateWorkflowName: (name) => {
    const normalized = name.trim();
    if (!normalized) throw new Error('Le nom du workflow ne peut pas être vide');
    set((state) => state.workflow
      ? { workflow: { ...state.workflow, name: normalized }, ...markDirty() }
      : {});
  },

  save: async () => {
    const state = get();
    if (!state.workflow || !state.dirty) return;
    set({ saveStatus: 'saving' });
    try {
      const definition = flowToWorkflow(state.nodes, state.edges, state.workflow);
      const saved = await workflows.update(state.workflow.id, definition);
      set({ workflow: { ...definition, ...saved }, dirty: false, saveStatus: 'saved' });
    } catch (error) {
      set({ saveStatus: 'error' });
      throw error;
    }
  },
}));
