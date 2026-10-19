import { Workflow } from './workflow.js';
import { NodeTypeDescription } from './node-types.js';
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
export declare function validateWorkflowSchema(workflow: unknown): ValidationResult;
export declare function validateWorkflow(workflow: Workflow, nodeTypes: NodeTypeDescription[], options?: ValidationOptions): ValidationIssue[];
export declare function renameNodeInWorkflow(workflow: Workflow, oldName: string, newName: string): Workflow;
export declare function generateUniqueNodeName(existingNames: string[], baseName: string): string;
export declare function validateWorkflowThrow(workflow: unknown): Workflow;
//# sourceMappingURL=validate-workflow.d.ts.map