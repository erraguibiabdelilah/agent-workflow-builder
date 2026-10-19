import type { Workflow, WorkflowNode, Connections } from './workflow';

/** Check an existing main graph, or check whether a proposed edge adds a cycle. */
export function hasCycle(connections: Connections): boolean;
export function hasCycle(connections: Connections, fromNode: string, toNode: string): boolean;
export function hasCycle(
  connections: Connections,
  fromNode?: string,
  toNode?: string,
): boolean {
  const graph = new Map<string, string[]>();
  
  for (const [sourceNode, types] of Object.entries(connections)) {
    const mainConnections = types.main;
    if (mainConnections) {
      const targets: string[] = [];
      mainConnections.forEach(outputs => {
        outputs.forEach(target => {
          targets.push(target.node);
        });
      });
      graph.set(sourceNode, targets);
    }
  }

  if (fromNode !== undefined && toNode !== undefined) {
    if (fromNode === toNode) return true;
    graph.set(fromNode, [...(graph.get(fromNode) || []), toNode]);
  }

  // DFS to detect cycle
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(node: string): boolean {
    if (recStack.has(node)) return true; // Cycle found
    if (visited.has(node)) return false;

    visited.add(node);
    recStack.add(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (dfs(neighbor)) return true;
    }

    recStack.delete(node);
    return false;
  }

  // Include targets with no outgoing edges so a proposed edge to a leaf is handled.
  const nodes = new Set(graph.keys());
  for (const targets of graph.values()) targets.forEach(target => nodes.add(target));
  for (const node of nodes) {
    if (!visited.has(node) && dfs(node)) {
      return true;
    }
  }

  return false;
}

/**
 * Generate unique name by appending number suffix if needed
 */
export function uniqueName(baseName: string, existingNames: string[]): string {
  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  let counter = 1;
  let candidate = `${baseName}${counter}`;
  
  while (existingNames.includes(candidate)) {
    counter++;
    candidate = `${baseName}${counter}`;
  }
  
  return candidate;
}

/**
 * Rename a node in workflow, updating all references
 */
export function renameNodeInWorkflow(
  workflow: Workflow,
  oldName: string,
  newName: string
): Workflow {
  if (oldName === newName) return workflow;

  // Update node name
  const updatedNodes = workflow.nodes.map(node => 
    node.name === oldName ? { ...node, name: newName } : node
  );

  // Update connection keys (source nodes)
  const updatedConnections: Connections = {};
  
  for (const [sourceName, types] of Object.entries(workflow.connections)) {
    const newSourceName = sourceName === oldName ? newName : sourceName;
    updatedConnections[newSourceName] = { ...types };
    
    // Update connection targets
    for (const [type, outputs] of Object.entries(types)) {
      if (outputs) {
        updatedConnections[newSourceName][type as keyof typeof types] = outputs.map(output =>
          output.map(target => ({
            ...target,
            node: target.node === oldName ? newName : target.node
          }))
        );
      }
    }
  }

  // Update expressions in node parameters
  const updatedNodesWithExpressions = updatedNodes.map(node => ({
    ...node,
    parameters: replaceNodeReferencesInObject(node.parameters, oldName, newName)
  }));

  return {
    ...workflow,
    nodes: updatedNodesWithExpressions as WorkflowNode[],
    connections: updatedConnections
  };
}

/**
 * Recursively replace node references in expressions
 */
function replaceNodeReferencesInObject(obj: unknown, oldName: string, newName: string): unknown {
  if (typeof obj === 'string') {
    return replaceNodeReferencesInString(obj, oldName, newName);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => replaceNodeReferencesInObject(item, oldName, newName));
  }
  
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = replaceNodeReferencesInObject(value, oldName, newName);
    }
    return result;
  }
  
  return obj;
}

/**
 * Replace node references in expression strings
 */
function replaceNodeReferencesInString(str: string, oldName: string, newName: string): string {
  // Escape special regex characters in node names
  const escapedOldName = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Replace $node["oldName"] and $node['oldName'] patterns
  const doubleQuotePattern = new RegExp(`\\$node\\["${escapedOldName}"\\]`, 'g');
  const singleQuotePattern = new RegExp(`\\$node\\['${escapedOldName}'\\]`, 'g');
  
  return str
    .replace(doubleQuotePattern, () => `$node["${newName}"]`)
    .replace(singleQuotePattern, () => `$node['${newName}']`);
}
