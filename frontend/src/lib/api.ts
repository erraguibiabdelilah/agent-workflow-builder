/**
 * API client for backend communication
 */
import type { NodeTypeDescription } from '../../shared/src/node-types';

const API_BASE = '/api';

// Token storage
let authToken: string | null = localStorage.getItem('auth_token');

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };
  
  // Add auth token if available
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: { message: response.statusText },
    }));
    const detail = error.detail;
    const detailMessage = typeof detail === 'string'
      ? detail
      : Array.isArray(detail?.issues)
        ? detail.issues.join('\n')
        : typeof detail?.message === 'string'
          ? detail.message
          : undefined;
    
    throw new ApiError(
      error.error?.message || detailMessage || 'Une erreur est survenue',
      response.status,
      error.error?.code,
      error.error?.details,
    );
  }
  
  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json();
}

// Auth API
export const auth = {
  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: response.statusText,
      }));
      throw new ApiError(
        error.detail || 'Échec de la connexion',
        response.status,
      );
    }
    
    const data = await response.json();
    // Store the token
    authToken = data.access_token;
    localStorage.setItem('auth_token', authToken!);
    
    return data;
  },
  
  async signup(email: string, password: string) {
    return fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  
  async logout() {
    await fetchApi('/auth/logout', {
      method: 'POST',
    });
    
    // Clear token
    authToken = null;
    localStorage.removeItem('auth_token');
    
    return { success: true };
  },
  
  async getSession() {
    try {
      if (!authToken) {
        return null;
      }
      
      const user = await fetchApi<{ id: string; email: string }>('/users/me');
      return { user };
    } catch (error) {
      // Clear invalid token
      authToken = null;
      localStorage.removeItem('auth_token');
      return null;
    }
  },
};

// Workflows API
export interface Workflow {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: Record<string, any>;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowListItem {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  last_execution?: {
    id: string;
    status: string;
    started_at: string;
    finished_at?: string;
  } | null;
}

export const workflows = {
  async list(): Promise<WorkflowListItem[]> {
    return fetchApi('/workflows');
  },
  
  async get(id: string): Promise<Workflow> {
    return fetchApi(`/workflows/${id}`);
  },
  
  async create(data: { name: string; nodes?: any[]; connections?: Record<string, any> }): Promise<Workflow> {
    return fetchApi('/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  async update(id: string, data: Partial<Workflow>): Promise<Workflow> {
    return fetchApi(`/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  async delete(id: string): Promise<void> {
    return fetchApi(`/workflows/${id}`, {
      method: 'DELETE',
    });
  },
  
  async duplicate(id: string): Promise<Workflow> {
    return fetchApi(`/workflows/${id}/duplicate`, {
      method: 'POST',
    });
  },
  
  async activate(id: string): Promise<void> {
    return fetchApi(`/workflows/${id}/activate`, {
      method: 'POST',
    });
  },
  
  async deactivate(id: string): Promise<void> {
    return fetchApi(`/workflows/${id}/deactivate`, {
      method: 'POST',
    });
  },
};

// Credentials API
export interface Credential {
  id: string;
  name: string;
  type: string;
  hint: string;
  created_at: string;
}

export const credentials = {
  async list(): Promise<Credential[]> {
    return fetchApi('/credentials');
  },
  
  async create(data: { name: string; type: string; data: Record<string, any> }): Promise<Credential> {
    return fetchApi('/credentials', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  async update(id: string, data: { name?: string; data?: Record<string, any> }): Promise<Credential> {
    return fetchApi(`/credentials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  async delete(id: string): Promise<void> {
    return fetchApi(`/credentials/${id}`, {
      method: 'DELETE',
    });
  },
  
  async test(data: { type: string; data?: Record<string, any>; credential_id?: string }): Promise<{ success: boolean; message: string }> {
    return fetchApi('/credentials/test', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Node Types API
export const nodeTypes = {
  async list(): Promise<NodeTypeDescription[]> {
    return fetchApi('/node-types');
  },
};

// Executions API
export interface Execution {
  id: string;
  workflow_id: string;
  status: 'running' | 'success' | 'error' | 'cancelled';
  mode: 'manual' | 'trigger' | 'webhook';
  started_at: string;
  finished_at?: string;
  error?: any;
}

export interface ExecutionNode {
  node_id: string;
  node_name: string;
  status: 'idle' | 'running' | 'success' | 'warning' | 'error' | 'skipped';
  started_at?: string;
  finished_at?: string;
  input?: any;
  output?: any;
  error?: any;
  trace?: AgentTrace[] | null;
}

export interface AgentTraceStep {
  index: number;
  text?: string;
  toolCalls: Array<{ toolName: string; input: unknown }>;
  toolResults: Array<{ toolName: string; output?: unknown; error?: string }>;
}

export interface AgentTrace {
  model: string;
  provider: string;
  iterations: number;
  finishReason: string;
  warning?: string;
  usage: { inputTokens: number; outputTokens: number };
  steps: AgentTraceStep[];
}

export interface ExecutionNodeDetail {
  nodeId: string;
  status: ExecutionNode['status'];
  input?: unknown;
  output?: unknown;
  error?: { type?: string; message?: string } | null;
  trace?: AgentTrace[] | null;
  outputCounts?: number[];
  startedAt?: string;
  finishedAt?: string;
}

export const executions = {
  async list(workflowId: string): Promise<Execution[]> {
    return fetchApi(`/workflows/${workflowId}/executions`);
  },
  
  async get(id: string): Promise<{ execution: Execution; nodes: ExecutionNode[] }> {
    return fetchApi(`/executions/${id}`);
  },

  async getNode(executionId: string, nodeId: string): Promise<ExecutionNodeDetail> {
    return fetchApi(`/executions/${encodeURIComponent(executionId)}/nodes/${encodeURIComponent(nodeId)}`);
  },
  
  async execute(workflowId: string, data?: { triggerNodeId?: string; items?: any[] }): Promise<{ executionId: string }> {
    return fetchApi(`/workflows/${workflowId}/execute`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },
};
