/**
 * Check if adding a connection would create a cycle in the main flow
 */
export function hasCycle(connections, fromNode, toNode) {
    if (fromNode === toNode)
        return true;
    // Build adjacency list for main connections only
    const graph = new Map();
    for (const [sourceNode, types] of Object.entries(connections)) {
        const mainConnections = types.main;
        if (mainConnections) {
            const targets = [];
            mainConnections.forEach(outputs => {
                outputs.forEach(target => {
                    targets.push(target.node);
                });
            });
            graph.set(sourceNode, targets);
        }
    }
    // Add the proposed connection temporarily
    const existingTargets = graph.get(fromNode) || [];
    graph.set(fromNode, [...existingTargets, toNode]);
    // DFS to detect cycle
    const visited = new Set();
    const recStack = new Set();
    function dfs(node) {
        if (recStack.has(node))
            return true; // Cycle found
        if (visited.has(node))
            return false;
        visited.add(node);
        recStack.add(node);
        const neighbors = graph.get(node) || [];
        for (const neighbor of neighbors) {
            if (dfs(neighbor))
                return true;
        }
        recStack.delete(node);
        return false;
    }
    // Check all nodes as potential starting points
    for (const node of graph.keys()) {
        if (!visited.has(node) && dfs(node)) {
            return true;
        }
    }
    return false;
}
/**
 * Generate unique name by appending number suffix if needed
 */
export function uniqueName(baseName, existingNames) {
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
export function renameNodeInWorkflow(workflow, oldName, newName) {
    if (oldName === newName)
        return workflow;
    // Update node name
    const updatedNodes = workflow.nodes.map(node => node.name === oldName ? { ...node, name: newName } : node);
    // Update connection keys (source nodes)
    const updatedConnections = {};
    for (const [sourceName, types] of Object.entries(workflow.connections)) {
        const newSourceName = sourceName === oldName ? newName : sourceName;
        updatedConnections[newSourceName] = { ...types };
        // Update connection targets
        for (const [type, outputs] of Object.entries(types)) {
            if (outputs) {
                updatedConnections[newSourceName][type] = outputs.map(output => output.map(target => ({
                    ...target,
                    node: target.node === oldName ? newName : target.node
                })));
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
        nodes: updatedNodesWithExpressions,
        connections: updatedConnections
    };
}
/**
 * Recursively replace node references in expressions
 */
function replaceNodeReferencesInObject(obj, oldName, newName) {
    if (typeof obj === 'string') {
        return replaceNodeReferencesInString(obj, oldName, newName);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => replaceNodeReferencesInObject(item, oldName, newName));
    }
    if (obj && typeof obj === 'object') {
        const result = {};
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
function replaceNodeReferencesInString(str, oldName, newName) {
    // Escape special regex characters in node names
    const escapedOldName = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Replace $node["oldName"] and $node['oldName'] patterns
    const doubleQuotePattern = new RegExp(`\\$node\\["${escapedOldName}"\\]`, 'g');
    const singleQuotePattern = new RegExp(`\\$node\\['${escapedOldName}'\\]`, 'g');
    return str
        .replace(doubleQuotePattern, `$node["${newName}"]`)
        .replace(singleQuotePattern, `$node['${newName}']`);
}
//# sourceMappingURL=graph-utils.js.map