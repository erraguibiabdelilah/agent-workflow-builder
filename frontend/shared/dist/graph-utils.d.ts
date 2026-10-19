import type { Workflow, Connections } from './workflow';
/**
 * Check if adding a connection would create a cycle in the main flow
 */
export declare function hasCycle(connections: Connections, fromNode: string, toNode: string): boolean;
/**
 * Generate unique name by appending number suffix if needed
 */
export declare function uniqueName(baseName: string, existingNames: string[]): string;
/**
 * Rename a node in workflow, updating all references
 */
export declare function renameNodeInWorkflow(workflow: Workflow, oldName: string, newName: string): Workflow;
//# sourceMappingURL=graph-utils.d.ts.map