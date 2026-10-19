import { ZodError } from 'zod';
import type { NodeProperty, NodeTypeDescription } from './node-types.js';
import { hasCycle, renameNodeInWorkflow, uniqueName } from './graph-utils.js';
import { workflowSchema, type Workflow, type WorkflowNode } from './workflow.js';

export interface ValidationError {
  path: string[];
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationIssue {
  nodeId: string | null;
  level: 'error' | 'warning';
  message: string;
}

export interface ValidationOptions {
  credentialIds?: string[];
}

export function validateWorkflowSchema(workflow: unknown): ValidationResult {
  try {
    workflowSchema.parse(workflow);
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        valid: false,
        errors: error.errors.map((issue) => ({
          path: issue.path.map(String),
          message: issue.message,
        })),
      };
    }
    return { valid: false, errors: [{ path: [], message: 'Erreur de validation inconnue' }] };
  }
}

export function validateWorkflow(
  workflow: Workflow,
  nodeTypes: NodeTypeDescription[],
  options: ValidationOptions = {},
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeTypeMap = new Map(nodeTypes.map((nodeType) => [nodeType.type, nodeType]));
  const nodesByName = new Map(workflow.nodes.map((node) => [node.name, node]));
  const names = new Map<string, WorkflowNode[]>();

  for (const node of workflow.nodes) {
    const group = names.get(node.name) ?? [];
    group.push(node);
    names.set(node.name, group);
  }
  for (const [name, duplicates] of names) {
    if (duplicates.length > 1) {
      for (const node of duplicates) {
        issues.push({ nodeId: node.id, level: 'error', message: `Nom de nœud dupliqué : ${name}` });
      }
    }
  }

  for (const node of workflow.nodes) {
    const description = nodeTypeMap.get(node.type);
    if (!description) {
      issues.push({ nodeId: node.id, level: 'error', message: `Type de nœud inconnu : ${node.type}` });
      continue;
    }

    const parameters = node.parameters ?? {};
    for (const property of description.properties) {
      const value = parameters[property.name];
      if (!isVisible(property, parameters)) continue;
      validateProperty(property, value, node.id, issues);
    }

    for (const credential of description.credentials ?? []) {
      if (!credential.required) continue;
      const credentialEntry = Object.entries(node.credentials ?? {}).find(
        ([type]) => type.toLowerCase() === credential.type.toLowerCase(),
      );
      const credentialId = credentialEntry?.[1];
      if (!credentialId) {
        issues.push({
          nodeId: node.id,
          level: 'error',
          message: `Credential requis manquant : ${credential.type}`,
        });
      } else if (options.credentialIds && !options.credentialIds.includes(credentialId)) {
        issues.push({ nodeId: node.id, level: 'error', message: `Credential introuvable : ${credentialId}` });
      }
    }

    const inputIndexes = new Map<string, number>();
    description.inputs.forEach((input) => {
      const inputIndex = inputIndexes.get(input.type) ?? 0;
      inputIndexes.set(input.type, inputIndex + 1);
      const connections = Object.values(workflow.connections).flatMap((sourceConnections) =>
        (sourceConnections[input.type] ?? []).flatMap((targets) => targets)
          .filter((target) => target.node === node.name && target.type === input.type && target.index === inputIndex),
      );
      if (input.required && connections.length === 0) {
        issues.push({
          nodeId: node.id,
          level: 'error',
          message: `Entrée requise non connectée : ${input.displayName || input.type}`,
        });
      }
      if (input.maxConnections !== undefined && connections.length > input.maxConnections) {
        issues.push({
          nodeId: node.id,
          level: 'error',
          message: `Trop de connexions sur ${input.displayName || input.type} (max: ${input.maxConnections})`,
        });
      }
    });

    for (const property of description.properties) {
      if (!isVisible(property, parameters)) continue;
      const value = parameters[property.name];
      const expressions = property.supportsExpressions
        ? collectStrings(value)
        : property.type === 'list' && Array.isArray(value)
          ? value.flatMap((item) => collectExpressionsFromFields(item, property.itemFields ?? []))
          : [];
      for (const expression of expressions) {
        for (const match of expression.matchAll(/\$node\[(?:"([^"]+)"|'([^']+)')\]/g)) {
          const referencedName = match[1] ?? match[2];
          if (referencedName && !nodesByName.has(referencedName)) {
            issues.push({
              nodeId: node.id,
              level: 'warning',
              message: `Référence à un nœud inexistant : ${referencedName}`,
            });
          }
        }
      }
    }
  }

  if (!workflow.nodes.some((node) => nodeTypeMap.get(node.type)?.kind === 'trigger')) {
    issues.push({ nodeId: null, level: 'warning', message: 'Aucun trigger trouvé' });
  }
  if (hasCycle(workflow.connections)) {
    issues.push({ nodeId: null, level: 'error', message: 'Cycle détecté dans les connexions principales' });
  }

  return issues;
}

function isVisible(property: NodeProperty, values: Record<string, unknown>): boolean {
  if (!property.showWhen) return true;
  return values[property.showWhen.property] === property.showWhen.equals;
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

function validateProperty(
  property: NodeProperty,
  value: unknown,
  nodeId: string,
  issues: ValidationIssue[],
): void {
  const label = property.displayName;
  if (property.required && isEmpty(value)) {
    issues.push({ nodeId, level: 'error', message: `Propriété requise manquante : ${label}` });
    return;
  }
  if (isEmpty(value)) return;

  let typeIsValid = true;
  switch (property.type) {
    case 'string':
    case 'text':
      typeIsValid = typeof value === 'string';
      break;
    case 'number':
      typeIsValid = typeof value === 'number' && Number.isFinite(value);
      if (typeIsValid && property.min !== undefined && (value as number) < property.min) typeIsValid = false;
      if (typeIsValid && property.max !== undefined && (value as number) > property.max) typeIsValid = false;
      break;
    case 'boolean':
      typeIsValid = typeof value === 'boolean';
      break;
    case 'options':
      typeIsValid = property.options?.some((option) => option.value === value) ?? true;
      break;
    case 'credential':
      typeIsValid = typeof value === 'string';
      break;
    case 'list':
      typeIsValid = Array.isArray(value);
      break;
    case 'json':
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
        } catch {
          typeIsValid = false;
        }
      }
      break;
  }
  if (!typeIsValid) {
    issues.push({ nodeId, level: 'error', message: `Valeur invalide : ${label}` });
  }

  if (property.type === 'list' && Array.isArray(value)) {
    value.forEach((entry, index) => {
      if (!isRecord(entry)) {
        issues.push({ nodeId, level: 'error', message: `${label} : élément ${index + 1} invalide` });
        return;
      }
      for (const field of property.itemFields ?? []) {
        if (isVisible(field, entry)) validateProperty(field, entry[field.name], nodeId, issues);
      }
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (isRecord(value)) return Object.values(value).flatMap(collectStrings);
  return [];
}

function collectExpressionsFromFields(value: unknown, fields: NodeProperty[]): string[] {
  if (!isRecord(value)) return [];
  return fields.flatMap((field) => {
    if (!isVisible(field, value)) return [];
    const fieldValue = value[field.name];
    if (field.supportsExpressions) return collectStrings(fieldValue);
    if (field.type === 'list' && Array.isArray(fieldValue)) {
      return fieldValue.flatMap((entry) => collectExpressionsFromFields(entry, field.itemFields ?? []));
    }
    return [];
  });
}

export function validateWorkflowThrow(workflow: unknown): Workflow {
  return workflowSchema.parse(workflow);
}

export { renameNodeInWorkflow, uniqueName };
export const generateUniqueNodeName = (existingNames: string[], baseName: string): string =>
  uniqueName(baseName, existingNames);
