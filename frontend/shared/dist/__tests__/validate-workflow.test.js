import { describe, it, expect } from 'vitest';
import { validateWorkflow } from '../validate-workflow';
describe('validate-workflow', () => {
    const sampleNodeTypes = [
        {
            type: 'manualTrigger',
            version: 1,
            displayName: 'Manual Trigger',
            description: 'Test trigger',
            category: 'trigger',
            kind: 'trigger',
            icon: 'zap',
            inputs: [],
            outputs: [{ type: 'main' }],
            properties: []
        },
        {
            type: 'agent',
            version: 1,
            displayName: 'Agent',
            description: 'Test agent',
            category: 'ai',
            kind: 'regular',
            icon: 'brain',
            inputs: [
                { type: 'main', required: true },
                { type: 'ai_languageModel', required: true, maxConnections: 1 }
            ],
            outputs: [{ type: 'main' }],
            properties: [
                { name: 'role', displayName: 'Role', type: 'string', required: true }
            ]
        },
        {
            type: 'chatModel',
            version: 1,
            displayName: 'Chat Model',
            description: 'Test model',
            category: 'model',
            kind: 'subnode',
            icon: 'message-square',
            inputs: [],
            outputs: [{ type: 'ai_languageModel' }],
            properties: [],
            credentials: [{ type: 'openai', required: true }]
        }
    ];
    it('should validate a correct workflow', () => {
        const workflow = {
            id: 'test',
            name: 'Test Workflow',
            active: false,
            nodes: [
                {
                    id: '1',
                    name: 'Trigger',
                    type: 'manualTrigger',
                    typeVersion: 1,
                    position: { x: 0, y: 0 },
                    parameters: {}
                },
                {
                    id: '2',
                    name: 'Agent',
                    type: 'agent',
                    typeVersion: 1,
                    position: { x: 100, y: 0 },
                    parameters: { role: 'Assistant' }
                }
            ],
            connections: {
                Trigger: { main: [[{ node: 'Agent', type: 'main', index: 0 }]] }
            }
        };
        const issues = validateWorkflow(workflow, sampleNodeTypes);
        // Should have one error: missing required ai_languageModel connection
        expect(issues).toHaveLength(1);
        expect(issues[0].level).toBe('error');
        expect(issues[0].nodeId).toBe('2');
        expect(issues[0].message).toContain('ai_languageModel');
    });
    it('should detect missing required properties', () => {
        const workflow = {
            id: 'test',
            name: 'Test Workflow',
            active: false,
            nodes: [
                {
                    id: '1',
                    name: 'Agent',
                    type: 'agent',
                    typeVersion: 1,
                    position: { x: 0, y: 0 },
                    parameters: {} // Missing required 'role' property
                }
            ],
            connections: {}
        };
        const issues = validateWorkflow(workflow, sampleNodeTypes);
        const roleIssue = issues.find(issue => issue.message.includes('Role'));
        expect(roleIssue).toBeDefined();
        expect(roleIssue?.level).toBe('error');
    });
    it('should detect duplicate node names', () => {
        const workflow = {
            id: 'test',
            name: 'Test Workflow',
            active: false,
            nodes: [
                {
                    id: '1',
                    name: 'Duplicate',
                    type: 'manualTrigger',
                    typeVersion: 1,
                    position: { x: 0, y: 0 },
                    parameters: {}
                },
                {
                    id: '2',
                    name: 'Duplicate',
                    type: 'agent',
                    typeVersion: 1,
                    position: { x: 100, y: 0 },
                    parameters: { role: 'Test' }
                }
            ],
            connections: {}
        };
        const issues = validateWorkflow(workflow, sampleNodeTypes);
        const duplicateIssues = issues.filter(issue => issue.message.includes('dupliqué'));
        expect(duplicateIssues).toHaveLength(2);
    });
    it('should warn about missing triggers', () => {
        const workflow = {
            id: 'test',
            name: 'Test Workflow',
            active: false,
            nodes: [
                {
                    id: '1',
                    name: 'Agent',
                    type: 'agent',
                    typeVersion: 1,
                    position: { x: 0, y: 0 },
                    parameters: { role: 'Test' }
                }
            ],
            connections: {}
        };
        const issues = validateWorkflow(workflow, sampleNodeTypes);
        const triggerWarning = issues.find(issue => issue.nodeId === null && issue.level === 'warning');
        expect(triggerWarning).toBeDefined();
        expect(triggerWarning?.message).toContain('trigger');
    });
    it('should validate credentials when provided', () => {
        const workflow = {
            id: 'test',
            name: 'Test Workflow',
            active: false,
            nodes: [
                {
                    id: '1',
                    name: 'Model',
                    type: 'chatModel',
                    typeVersion: 1,
                    position: { x: 0, y: 0 },
                    parameters: {},
                    credentials: { openai: 'invalid-credential-id' }
                }
            ],
            connections: {}
        };
        const issues = validateWorkflow(workflow, sampleNodeTypes, {
            credentialIds: ['valid-credential-id']
        });
        const credentialIssue = issues.find(issue => issue.message.includes('Credential'));
        expect(credentialIssue).toBeDefined();
        expect(credentialIssue?.level).toBe('error');
    });
    it('should detect maxConnections violations', () => {
        const workflow = {
            id: 'test',
            name: 'Test Workflow',
            active: false,
            nodes: [
                {
                    id: '1',
                    name: 'Model1',
                    type: 'chatModel',
                    typeVersion: 1,
                    position: { x: 0, y: 0 },
                    parameters: {}
                },
                {
                    id: '2',
                    name: 'Model2',
                    type: 'chatModel',
                    typeVersion: 1,
                    position: { x: 0, y: 50 },
                    parameters: {}
                },
                {
                    id: '3',
                    name: 'Agent',
                    type: 'agent',
                    typeVersion: 1,
                    position: { x: 100, y: 0 },
                    parameters: { role: 'Test' }
                }
            ],
            connections: {
                Model1: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 1 }]] },
                Model2: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 1 }]] }
            }
        };
        const issues = validateWorkflow(workflow, sampleNodeTypes);
        const maxConnectionIssue = issues.find(issue => issue.message.includes('Trop de connexions'));
        expect(maxConnectionIssue).toBeDefined();
        expect(maxConnectionIssue?.level).toBe('error');
    });
});
//# sourceMappingURL=validate-workflow.test.js.map