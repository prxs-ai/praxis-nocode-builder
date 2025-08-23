import type { WorkflowNode, WorkflowEdge } from './types'
export interface WorkflowExecutionPayload {
  workflow_id: string  // Backend expects snake_case
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  metadata: {
    name: string
    description: string
    version: string
    createdAt: string
  }
}
export interface WorkflowExecutionResponse {
  success: boolean
  workflowId: string
  executionId: string
  message: string
  estimatedDuration?: number
}
export interface WorkflowStatusResponse {
  workflowId: string
  executionId: string
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error' | 'cancelled'
  progress: number
  currentNode?: string
  completedNodes: string[]
  erroredNodes: string[]
  startTime: string
  endTime?: string
  error?: string
}
export interface ApiError {
  message: string
  code: string
  details?: any
}
class WorkflowApiClient {
  private baseUrl: string
  constructor(baseUrl: string = 'http://localhost:8001/api/workflow') {
    this.baseUrl = baseUrl
  }
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = {
        message: response.statusText || 'Unknown error',
        code: response.status.toString(),
      }
      try {
        const errorData = await response.json()
        error.message = errorData.message || error.message
        error.details = errorData.details
      } catch {
      }
      throw error
    }
    return response.json()
  }
  async executeWorkflow(payload: WorkflowExecutionPayload): Promise<WorkflowExecutionResponse> {
    const response = await fetch(`${this.baseUrl}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    return this.handleResponse<WorkflowExecutionResponse>(response)
  }
  async stopWorkflow(workflowId: string, executionId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/cancel/${workflowId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ executionId }),
    })
    return this.handleResponse<{ success: boolean; message: string }>(response)
  }
  async pauseWorkflow(workflowId: string, executionId: string): Promise<{ success: boolean; message: string }> {
    return this.stopWorkflow(workflowId, executionId)
  }
  async resumeWorkflow(workflowId: string, executionId: string): Promise<{ success: boolean; message: string }> {
    throw new Error('Resume functionality not supported by backend')
  }
  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatusResponse> {
    const response = await fetch(`${this.baseUrl}/status/${workflowId}`)
    return this.handleResponse<WorkflowStatusResponse>(response)
  }
}
export const workflowApiClient = new WorkflowApiClient()