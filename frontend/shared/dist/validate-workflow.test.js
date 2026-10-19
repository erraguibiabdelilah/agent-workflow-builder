import { describe, it, expect } from 'vitest';
import { validateWorkflow, generateUniqueNodeName, renameNodeInWorkflow } from './validate-workflow.js';
describe('validateWorkflow', () => {
    it('should validate a valid workflow', () => {
        const workflow = {
            id: 'wf-123',
            name: 'Test Workflow',
            active: false,
            nodes: [
                {
                    id: 'n1',
                    name: 'Start',
                    type: 'manual',
                    typeVersion: 1,
                    position: { x: 0, y: 0 },
                    parameters: {}
                }
            ],
            connections: {}
        };
        const result = validateWorkflow(workflow);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });
    it('should reject workflow with duplicate node names', () => {
        const workflow = {
            id: 'wf-123',
            name: 'Test Workflow',
            active: false,
            nodes: [
                {
                    id: 'n1',
                    name: 'Duplicate',
                    type: 'manual',
                    typeVersion: 1,
                    position: { x: 0, y: 0 },
                    parameters: {}
                },
                {
                    id: 'n2',
                    name: 'Duplicate',
                    type: 'manual',
                    typeVersion: 1,
                    position: { x: 100, y: 0 },
                    parameters: {}
                }
            ],
            connections: {}
        };
        const result = validateWorkflow(workflow);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.message.includes('uniques'))).toBe(true);
    });
    it('should reject workflow with invalid connection reference', () => {
        const workflow = {
            id: 'wf-123',
            name: 'Test Workflow',
            active: false,
            nodes: [
                {
                    id: 'n1',
                    name: 'Start',
                    type: 'manual',
                    typeVersion: 1,
                    position: { x: 0, y: 0 },
                    parameters: {}
                }
            ],
            connections: {
                'Start': {
                    main: [[{ node: 'NonExistent', type: 'main', index: 0 }]]
                }
            }
        };
        const result = validateWorkflow(workflow);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.message.includes('existants'))).toBe(true);
    });
});
describe('generateUniqueNodeName', () => {
    it('should return base name if not taken', () => {
        const result = generateUniqueNodeName(['Agent', 'HTTP Request'], 'Manual');
        expect(result).toBe('Manual');
    });
    it('should add counter if base name is taken', () => {
        const result = generateUniqueNodeName(['Agent', 'Agent1'], 'Agent');
        expect(result).toBe('Agent2');
    });
    it('should find first available counter', () => {
        const result = generateUniqueNodeName(['Agent', 'Agent2'], 'Agent');
        expect(result).toBe('Agent1');
    });
});
describe('renameNodeInWorkflow', () => {
    it('should rename node and update connections', () => {
        const workflow = {
            id: 'wf-123',
            name: 'Test',
            active: false,
            nodes: [
                { id: 'n1', name: 'OldName', type: 'manual', typeVersion: 1, position: { x: 0, y: 0 }, parameters: {} },
                { id: 'n2', name: 'Other', type: 'manual', typeVersion: 1, position: { x: 100, y: 0 }, parameters: {} }
            ],
            connections: {
                'OldName': {
                    main: [[{ node: 'Other', type: 'main', index: 0 }]]
                },
                'Other': {
                    main: [[{ node: 'OldName', type: 'main', index: 0 }]]
                }
            }
        };
        const result = renameNodeInWorkflow(workflow, 'OldName', 'NewName');
        expect(result.nodes.find(n => n.id === 'n1')?.name).toBe('NewName');
        expect(result.connections['NewName']).toBeDefined();
        expect(result.connections['OldName']).toBeUndefined();
        expect(result.connections['Other'].main?.[0]?.[0]?.node).toBe('NewName');
    });
});
//# sourceMappingURL=validate-workflow.test.js.map