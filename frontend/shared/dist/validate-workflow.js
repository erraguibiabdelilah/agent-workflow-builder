import { workflowSchema } from './workflow.js';
import { ZodError } from 'zod';
// Original simple validation for basic schema compliance
export function validateWorkflowSchema(workflow) {
    try {
        workflowSchema.parse(workflow);
        return { valid: true, errors: [] };
    }
    catch (error) {
        if (error instanceof ZodError) {
            const errors = error.errors.map(err => ({
                path: err.path.map(p => String(p)),
                message: err.message,
            }));
            return { valid: false, errors };
        }
        return {
            valid: false,
            errors: [{ path: [], message: 'Erreur de validation inconnue' }],
        };
    }
}
// Enhanced validation for execution engine
export function validateWorkflow(workflow, nodeTypes, options = {}) {
    const issues = [];
    // Create lookup maps for efficiency
    const nodeTypeMap = new Map();
    nodeTypes.forEach(nt => nodeTypeMap.set(nt.type, nt));
    const nodesByName = new Map();
    workflow.nodes.forEach(node => nodesByName.set(node.name, node));
    // 1. Check for duplicate node names
    const nameCount = new Map();
    for (const node of workflow.nodes) {
        if (!nameCount.has(node.name)) {
            nameCount.set(node.name, []);
        }
        nameCount.get(node.name).push(node.id);
    }
    // Add issues for all duplicates
    for (const [name, nodeIds] of nameCount) {
        if (nodeIds.length > 1) {
            for (const nodeId of nodeIds) {
                issues.push({
                    nodeId: nodeId,
                    level: 'error',
                    message: `Nom de nœud dupliqué : ${name}`
                });
            }
        }
    }
    // 2. Validate each node
    for (const node of workflow.nodes) {
        const nodeType = nodeTypeMap.get(node.type);
        if (!nodeType) {
            issues.push({
                nodeId: node.id, // Use ID instead of name
                level: 'error',
                message: `Type de nœud inconnu : ${node.type}`
            });
            continue;
        }
        // Check required properties
        for (const property of nodeType.properties) {
            if (property.required) {
                const value = node.parameters?.[property.name];
                if (value === undefined || value === null || value === '') {
                    issues.push({
                        nodeId: node.id, // Use ID instead of name
                        level: 'error',
                        message: `Propriété requise manquante : ${property.displayName}`
                    });
                }
            }
        }
        // Check required credentials
        if (nodeType.credentials) {
            for (const credentialSpec of nodeType.credentials) {
                if (credentialSpec.required) {
                    const credentialId = node.credentials?.[credentialSpec.type];
                    if (!credentialId) {
                        issues.push({
                            nodeId: node.id, // Use ID instead of name
                            level: 'error',
                            message: `Credential requis manquant : ${credentialSpec.type}`
                        });
                    }
                    else if (options.credentialIds && !options.credentialIds.includes(credentialId)) {
                        issues.push({
                            nodeId: node.id, // Use ID instead of name
                            level: 'error',
                            message: `Credential introuvable : ${credentialId}`
                        });
                    }
                }
            }
        }
        // Check required inputs
        for (const input of nodeType.inputs) {
            if (input.required) {
                const hasConnection = Object.values(workflow.connections).some(nodeConnections => Object.entries(nodeConnections).some(([connectionType, typeConnections]) => connectionType === input.type &&
                    typeConnections?.some(outputConnections => outputConnections.some(target => target.node === node.name))));
                if (!hasConnection) {
                    issues.push({
                        nodeId: node.id, // Use ID instead of name
                        level: 'error',
                        message: `Entrée requise non connectée : ${input.displayName || input.type}`
                    });
                }
            }
        }
        // Check maxConnections for inputs
        for (const input of nodeType.inputs) {
            if (input.maxConnections) {
                let connectionCount = 0;
                Object.values(workflow.connections).forEach(nodeConnections => Object.entries(nodeConnections).forEach(([connectionType, typeConnections]) => {
                    if (connectionType === input.type) {
                        typeConnections?.forEach(outputConnections => outputConnections.forEach(target => {
                            if (target.node === node.name)
                                connectionCount++;
                        }));
                    }
                }));
                if (connectionCount > input.maxConnections) {
                    issues.push({
                        nodeId: node.id, // Use ID instead of name
                        level: 'error',
                        message: `Trop de connexions sur ${input.displayName || input.type} (max: ${input.maxConnections})`
                    });
                }
            }
        }
    }
    // 3. Check for trigger nodes
    const triggerNodes = workflow.nodes.filter(node => {
        const nodeType = nodeTypeMap.get(node.type);
        return nodeType?.kind === 'trigger';
    });
    if (triggerNodes.length === 0) {
        issues.push({
            nodeId: null,
            level: 'warning',
            message: 'Aucun nœud trigger trouvé'
        });
    }
    // 4. Check for cycles in main connections (simplified)
    const visited = new Set();
    const recursionStack = new Set();
    function hasCycle(nodeId) {
        if (recursionStack.has(nodeId))
            return true;
        if (visited.has(nodeId))
            return false;
        visited.add(nodeId);
        recursionStack.add(nodeId);
        const connections = workflow.connections[nodeId]?.main;
        if (connections) {
            for (const outputConnections of connections) {
                for (const target of outputConnections) {
                    if (hasCycle(target.node))
                        return true;
                }
            }
        }
        recursionStack.delete(nodeId);
        return false;
    }
    for (const node of workflow.nodes) {
        if (!visited.has(node.name) && hasCycle(node.name)) {
            issues.push({
                nodeId: node.id, // Use ID instead of name
                level: 'error',
                message: 'Cycle détecté dans les connexions'
            });
            break;
        }
    }
    // 5. Check expressions referencing non-existent nodes (warnings)
    for (const node of workflow.nodes) {
        const nodeType = nodeTypeMap.get(node.type);
        if (!nodeType)
            continue;
        for (const property of nodeType.properties) {
            if (property.supportsExpressions) {
                const value = node.parameters?.[property.name];
                if (typeof value === 'string') {
                    // Simple regex to find $node["NodeName"] references
                    const nodeRefs = value.match(/\$node\["([^"]+)"\]/g);
                    if (nodeRefs) {
                        for (const ref of nodeRefs) {
                            const nodeName = ref.match(/\$node\["([^"]+)"\]/)?.[1];
                            if (nodeName && !nodesByName.has(nodeName)) {
                                issues.push({
                                    nodeId: node.id, // Use ID instead of name
                                    level: 'warning',
                                    message: `Référence à un nœud inexistant : ${nodeName}`
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    return issues;
}
// Utilitaires pour renommer un node dans un workflow
export function renameNodeInWorkflow(workflow, oldName, newName) {
    // Mettre à jour le nom du node
    const updatedNodes = workflow.nodes.map(node => node.name === oldName ? { ...node, name: newName } : node);
    // Mettre à jour les connexions
    const updatedConnections = { ...workflow.connections };
    // Renommer la clé source si elle existe
    if (updatedConnections[oldName]) {
        updatedConnections[newName] = updatedConnections[oldName];
        delete updatedConnections[oldName];
    }
    // Renommer toutes les références cibles
    for (const [sourceName, sourceConnections] of Object.entries(updatedConnections)) {
        for (const [connectionType, connectionArray] of Object.entries(sourceConnections)) {
            if (connectionArray) {
                for (const outputConnections of connectionArray) {
                    for (const target of outputConnections) {
                        if (target.node === oldName) {
                            target.node = newName;
                        }
                    }
                }
            }
        }
    }
    return {
        ...workflow,
        nodes: updatedNodes,
        connections: updatedConnections,
    };
}
// Générer un nom unique pour un nouveau node
export function generateUniqueNodeName(existingNames, baseName) {
    if (!existingNames.includes(baseName)) {
        return baseName;
    }
    let counter = 1;
    while (existingNames.includes(`${baseName}${counter}`)) {
        counter++;
    }
    return `${baseName}${counter}`;
}
export function validateWorkflowThrow(workflow) {
    return workflowSchema.parse(workflow);
}
//# sourceMappingURL=validate-workflow.js.map