import type { Node, XYPosition } from "reactflow"
import type { NodeData, AgentNodeData, ToolNodeData, HandoffNodeData, WorkflowNode } from "./types"

const nodeCounters: Record<string, number> = {}

export const generateNodeId = (type: string): string => {
  if (!nodeCounters[type]) {
    nodeCounters[type] = 0
  }
  nodeCounters[type]++
  return `${type}-${Date.now()}-${nodeCounters[type]}`
}

export const getAutoNumberedLabel = (type: string): string => {
  const currentCount = nodeCounters[type] || 0
  
  const baseLabel = getDefaultLabel(type)
  return currentCount === 1 ? baseLabel : `${baseLabel} ${currentCount}`
}

export const createNode = ({
  type,
  position,
  id,
}: {
  type: string
  position: XYPosition
  id: string
}): WorkflowNode => {
  const baseData = {
    id,
    label: getAutoNumberedLabel(type),
    description: getDefaultDescription(type),
    status: 'idle' as const,
  }

  switch (type) {
    case "agent":
      return {
        id,
        type,
        position,
        data: {
          ...baseData,
          type: 'agent',
          config: {
            name: baseData.label,
            description: baseData.description || 'AI Agent',
            model: 'gpt-4o',
            temperature: 0.7,
            maxTokens: 2000,
            systemPrompt: 'You are a helpful AI assistant.',
          }
        } as AgentNodeData,
      }
    case "tool":
      return {
        id,
        type,
        position,
        data: {
          ...baseData,
          type: 'tool',
          source: 'mcp_tools',
          toolId: 'search',
          parameters: {},
          inputMapping: {},
          outputMapping: {},
        } as ToolNodeData,
      }
    case "handoff":
      return {
        id,
        type,
        position,
        data: {
          ...baseData,
          type: 'handoff',
          condition: 'completion',
          routing: {
            targetAgent: '',
            fallbackAgent: '',
            context: {},
          }
        } as HandoffNodeData,
      }
    default:
      return {
        id,
        type,
        position,
        data: {
          ...baseData,
          type: 'agent',
          config: {
            name: baseData.label,
            description: baseData.description || 'Unknown Node',
            model: 'gpt-4o',
            temperature: 0.7,
            maxTokens: 2000,
            systemPrompt: 'You are a helpful AI assistant.',
          }
        } as AgentNodeData,
      }
  }
}

const getDefaultLabel = (type: string): string => {
  switch (type) {
    case "agent":
      return "Agent Node"
    case "tool":
      return "Tool Node"
    case "handoff":
      return "Handoff Node"
    default:
      return "Node"
  }
}

const getDefaultDescription = (type: string): string => {
  switch (type) {
    case "agent":
      return "AI Agent for processing tasks"
    case "tool":
      return "Tool or capability for agents"
    case "handoff":
      return "Control between agents"
    default:
      return "Workflow node"
  }
}

export const resetNodeCounters = (): void => {
  Object.keys(nodeCounters).forEach(key => {
    nodeCounters[key] = 0
  })
}

export const getNodeCounter = (type: string): number => {
  return nodeCounters[type] || 0
}
