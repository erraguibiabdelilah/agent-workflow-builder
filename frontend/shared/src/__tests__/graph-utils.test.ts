import { describe, it, expect } from 'vitest';
import { hasCycle, uniqueName, renameNodeInWorkflow } from '../graph-utils';
import type { Workflow, Connections } from '../workflow';

describe('graph-utils', () => {
  describe('hasCycle', () => {
    it('should detect simple cycles', () => {
      const connections: Connections = {
        A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
        B: { main: [[{ node: 'A', type: 'main', index: 0 }]] }
      };
      
      expect(hasCycle(connections, 'A', 'B')).toBe(true);
    });

    it('should detect self-loops', () => {
      const connections: Connections = {};
      expect(hasCycle(connections, 'A', 'A')).toBe(true);
    });

    it('should not detect cycles in valid flows', () => {
      const connections: Connections = {
        A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
        B: { main: [[{ node: 'C', type: 'main', index: 0 }]] }
      };
      
      expect(hasCycle(connections, 'A', 'B')).toBe(false);
    });

    it('should ignore non-main connections for cycle detection', () => {
      const connections: Connections = {
        A: { ai_languageModel: [[{ node: 'B', type: 'ai_languageModel', index: 0 }]] }
      };
      
      expect(hasCycle(connections, 'B', 'A')).toBe(false);
    });
  });

  describe('uniqueName', () => {
    it('should return original name if unique', () => {
      expect(uniqueName('Agent', ['Other', 'Names'])).toBe('Agent');
    });

    it('should add number suffix for duplicates', () => {
      expect(uniqueName('Agent', ['Agent', 'Other'])).toBe('Agent1');
      expect(uniqueName('Agent', ['Agent', 'Agent1', 'Agent2'])).toBe('Agent3');
    });

    it('should handle empty existing names', () => {
      expect(uniqueName('Agent', [])).toBe('Agent');
    });
  });

  describe('renameNodeInWorkflow', () => {
    it('should rename node and update connections', () => {
      const workflow: Workflow = {
        id: 'test',
        name: 'Test',
        active: false,
        nodes: [
          { id: '1', name: 'OldName', type: 'agent', typeVersion: 1, position: { x: 0, y: 0 }, parameters: {} },
          { id: '2', name: 'Other', type: 'set', typeVersion: 1, position: { x: 100, y: 0 }, parameters: {} }
        ],
        connections: {
          OldName: { main: [[{ node: 'Other', type: 'main', index: 0 }]] },
          Other: { main: [[{ node: 'OldName', type: 'main', index: 0 }]] }
        }
      };

      const result = renameNodeInWorkflow(workflow, 'OldName', 'NewName');
      
      expect(result.nodes.find(n => n.id === '1')?.name).toBe('NewName');
      expect(result.connections.NewName).toBeDefined();
      expect(result.connections.OldName).toBeUndefined();
      expect(result.connections.Other.main?.[0]?.[0]?.node).toBe('NewName');
    });

    it('should update expressions in parameters', () => {
      const workflow: Workflow = {
        id: 'test',
        name: 'Test',
        active: false,
        nodes: [
          { 
            id: '1', 
            name: 'OldName', 
            type: 'agent', 
            typeVersion: 1, 
            position: { x: 0, y: 0 }, 
            parameters: {} 
          },
          { 
            id: '2', 
            name: 'Other', 
            type: 'set', 
            typeVersion: 1, 
            position: { x: 100, y: 0 }, 
            parameters: {
              template: 'Hello {{ $node["OldName"].json.output }}'
            }
          }
        ],
        connections: {}
      };

      const result = renameNodeInWorkflow(workflow, 'OldName', 'NewName');
      const otherNode = result.nodes.find(n => n.name === 'Other');
      
      expect(otherNode?.parameters.template).toBe('Hello {{ $node["NewName"].json.output }}');
    });

    it('should return unchanged workflow if names are the same', () => {
      const workflow: Workflow = {
        id: 'test',
        name: 'Test',
        active: false,
        nodes: [
          { id: '1', name: 'Same', type: 'agent', typeVersion: 1, position: { x: 0, y: 0 }, parameters: {} }
        ],
        connections: {}
      };

      const result = renameNodeInWorkflow(workflow, 'Same', 'Same');
      expect(result).toBe(workflow);
    });
  });
});