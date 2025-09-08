import type { Node, Edge } from "reactflow"

export interface BaseNodeData {
  id: string
  label: string
  description?: string
  status: 'idle' | 'running' | 'success' | 'error'
}

export interface AgentNodeData extends BaseNodeData {
  type: 'agent'
  config: {
    name: string
    description: string
    model: string
    temperature: number
    maxTokens: number
    systemPrompt: string
  }
}

export interface ToolNodeData extends BaseNodeData {
  type: 'tool'
  source: 'agent_skills' | 'mcp_tools'
  toolId: string
  parameters: Record<string, any>
  inputMapping?: Record<string, any>
  outputMapping?: Record<string, any>
}

export interface HandoffNodeData extends BaseNodeData {
  type: 'handoff'
  condition: 'completion' | 'condition' | 'error' | 'timeout'
  routing: {
    targetAgent: string
    fallbackAgent?: string
    context: Record<string, any>
  }
}

export type NodeData = AgentNodeData | ToolNodeData | HandoffNodeData

export interface WorkflowNode extends Node {
  data: NodeData
}

export interface WorkflowEdgeData {
  dataType?: 'text' | 'json' | 'image' | 'structured' | 'p2p_message' | 'structured_content' | 'formatted_post' | 'p2p_request' | 'market_analysis' | 'risk_params' | 'execution_plan' | 'trade_order' | 'content_brief' | 'generated_content' | 'distribution_plan' | 'performance_data' | 'analytics_request' | 'optimization_feedback' | 'data_request' | 'raw_data' | 'analysis_request' | 'analysis_results' | 'research_report' | 'feedback_loop'
  schema?: any
  sourceNodeId?: string
  animated?: boolean
  label?: string
}

export type WorkflowEdge = Edge & {
  data?: WorkflowEdgeData
}

export interface WorkflowState {
  id: string
  name: string
  description: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  metadata: {
    createdAt: Date
    updatedAt: Date
    version: string
  }
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic'
  model: string
  temperature: number
  maxTokens: number
  systemPrompt?: string
}

export interface MCPToolConfig {
  serverId: string
  toolName: string
  parameters: Record<string, any>
}

export interface NodeLibraryItem {
  type: 'agent' | 'tool' | 'handoff'
  label: string
  description: string
  icon: React.ReactNode
  defaultConfig?: Partial<NodeData>
}

export const AVAILABLE_MODELS = [
  'gpt-4-turbo-preview',
  'gpt-4o',
  'gpt-4o-mini',
  'claude-3-opus',
  'claude-3-sonnet',
  'claude-3-haiku'
] as const

export const MOCK_TOOLS = [
  {
    id: 'search',
    name: 'Web Search',
    source: 'mcp_tools' as const,
    description: 'Search the web for information'
  },
  {
    id: 'calculator',
    name: 'Calculator',
    source: 'agent_skills' as const,
    description: 'Perform mathematical calculations'
  },
  {
    id: 'file_reader',
    name: 'File Reader',
    source: 'mcp_tools' as const,
    description: 'Read and analyze files'
  },
  {
    id: 'email_sender',
    name: 'Email Sender',
    source: 'agent_skills' as const,
    description: 'Send email notifications'
  }
]

// ===== Chat and WebSocket Types (added) =====

export interface ToolResultMetadata {
  toolName: string
  fileName: string
  downloadUrl: string
  datasetUrl?: string
  preview?: any
  username?: string
  tweetsFound?: number
  summary?: string
}

export interface DSLAnalysisResult {
  success: boolean
  command?: string
  error?: string
  matchedAgents?: Array<{
    id?: string
    name?: string
    agentName?: string
    capabilities?: string[]
    reasoning?: string
    matchScore?: number
  }>
  requiredMCPTools?: Array<{
    name: string
    description?: string
    category?: string
  }>
  workflowSuggestion?: {
    nodes: any[]
    edges: any[]
  }
  workflow?: {
    nodes: any[]
    edges: any[]
  }
  processTime?: number
}

export interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: number
  type: 'text' | 'system' | 'error' | 'success' | 'dsl_progress' | 'dsl_result' | 'tool_result'
  metadata?: {
    isDslCommand?: boolean
    analysisResult?: DSLAnalysisResult
    toolResult?: ToolResultMetadata
    [key: string]: any
  }
}

export interface WebSocketMessage {
  type: string
  payload?: any
  timestamp: string
  messageId: string
}

export interface WebSocketConnectionStatus {
  connected: boolean
  connecting: boolean
  error: string | null
  lastPingTime: number | null
  reconnectAttempts: number
}

export interface DSLCommandPayload {
  command: string
  workflowId?: string
  context?: any
}

export interface DSLAnalysisProgress {
  stage: 'analyzing' | 'discovering' | 'matching' | 'generating' | 'complete' | string
  message: string
  details?: any
}

export interface AgentAssignment { [key: string]: any }
export interface ToolInvocation { [key: string]: any }
export interface WorkflowExecutionTimeline { [key: string]: any }
export interface PerformanceMetrics { [key: string]: any }
