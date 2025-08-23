import type { WorkflowNode, WorkflowEdge } from './types'
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  summary: {
    totalNodes: number
    totalEdges: number
    agentNodes: number
    toolNodes: number
    handoffNodes: number
    disconnectedNodes: number
    cyclesDetected: number
  }
}
export interface ValidationError {
  type: 'error'
  code: string
  message: string
  nodeId?: string
  edgeId?: string
  details?: any
}
export interface ValidationWarning {
  type: 'warning'
  code: string
  message: string
  nodeId?: string
  edgeId?: string
  details?: any
}
export class WorkflowValidator {
  private nodes: WorkflowNode[]
  private edges: WorkflowEdge[]
  constructor(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    this.nodes = nodes
    this.edges = edges
  }
  validate(): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    this.validateBasicStructure(errors, warnings)
    this.validateNodes(errors, warnings)
    this.validateEdges(errors, warnings)
    this.validateConnectivity(errors, warnings)
    this.validateCycles(errors, warnings)
    this.validateConfigurations(errors, warnings)
    const summary = this.generateSummary()
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary
    }
  }
  private validateBasicStructure(errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (this.nodes.length === 0) {
      errors.push({
        type: 'error',
        code: 'EMPTY_WORKFLOW',
        message: 'Workflow must contain at least one node'
      })
      return
    }
    if (this.nodes.length === 1 && this.edges.length === 0) {
      warnings.push({
        type: 'warning',
        code: 'SINGLE_NODE',
        message: 'Workflow contains only one node with no connections'
      })
    }
  }
  private validateNodes(errors: ValidationError[], warnings: ValidationWarning[]): void {
    const nodeIds = new Set<string>()
    for (const node of this.nodes) {
      if (nodeIds.has(node.id)) {
        errors.push({
          type: 'error',
          code: 'DUPLICATE_NODE_ID',
          message: `Duplicate node ID found: ${node.id}`,
          nodeId: node.id
        })
      }
      nodeIds.add(node.id)
      if (!node.data) {
        errors.push({
          type: 'error',
          code: 'MISSING_NODE_DATA',
          message: `Node ${node.id} is missing data`,
          nodeId: node.id
        })
        continue
      }
      if (!node.data.label || node.data.label.trim() === '') {
        warnings.push({
          type: 'warning',
          code: 'EMPTY_NODE_LABEL',
          message: `Node ${node.id} has no label`,
          nodeId: node.id
        })
      }
      this.validateNodeType(node, errors, warnings)
    }
  }
  private validateNodeType(node: WorkflowNode, errors: ValidationError[], warnings: ValidationWarning[]): void {
    switch (node.data.type) {
      case 'agent':
        if (!node.data.config?.name) {
          errors.push({
            type: 'error',
            code: 'MISSING_AGENT_NAME',
            message: `Agent node ${node.id} is missing a name`,
            nodeId: node.id
          })
        }
        if (!node.data.config?.model) {
          errors.push({
            type: 'error',
            code: 'MISSING_AGENT_MODEL',
            message: `Agent node ${node.id} is missing a model configuration`,
            nodeId: node.id
          })
        }
        if (!node.data.config?.systemPrompt || node.data.config.systemPrompt.trim() === '') {
          warnings.push({
            type: 'warning',
            code: 'EMPTY_SYSTEM_PROMPT',
            message: `Agent node ${node.id} has no system prompt`,
            nodeId: node.id
          })
        }
        break
      case 'tool':
        if (!node.data.toolId) {
          errors.push({
            type: 'error',
            code: 'MISSING_TOOL_ID',
            message: `Tool node ${node.id} is missing a tool ID`,
            nodeId: node.id
          })
        }
        if (!node.data.source) {
          errors.push({
            type: 'error',
            code: 'MISSING_TOOL_SOURCE',
            message: `Tool node ${node.id} is missing a source configuration`,
            nodeId: node.id
          })
        }
        break
      case 'handoff':
        if (!node.data.routing?.targetAgent) {
          errors.push({
            type: 'error',
            code: 'MISSING_HANDOFF_TARGET',
            message: `Handoff node ${node.id} is missing a target agent`,
            nodeId: node.id
          })
        }
        break
      default:
        errors.push({
          type: 'error',
          code: 'UNKNOWN_NODE_TYPE',
          message: `Unknown node type: ${node.data.type}`,
          nodeId: node.id
        })
    }
  }
  private validateEdges(errors: ValidationError[], warnings: ValidationWarning[]): void {
    const nodeIds = new Set(this.nodes.map(n => n.id))
    for (const edge of this.edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push({
          type: 'error',
          code: 'INVALID_EDGE_SOURCE',
          message: `Edge ${edge.id} references non-existent source node: ${edge.source}`,
          edgeId: edge.id
        })
      }
      if (!nodeIds.has(edge.target)) {
        errors.push({
          type: 'error',
          code: 'INVALID_EDGE_TARGET',
          message: `Edge ${edge.id} references non-existent target node: ${edge.target}`,
          edgeId: edge.id
        })
      }
      if (edge.source === edge.target) {
        warnings.push({
          type: 'warning',
          code: 'SELF_LOOP',
          message: `Edge ${edge.id} creates a self-loop on node ${edge.source}`,
          edgeId: edge.id
        })
      }
    }
  }
  private validateConnectivity(errors: ValidationError[], warnings: ValidationWarning[]): void {
    const connectedNodes = new Set<string>()
    for (const edge of this.edges) {
      connectedNodes.add(edge.source)
      connectedNodes.add(edge.target)
    }
    const disconnectedNodes = this.nodes.filter(node => !connectedNodes.has(node.id))
    if (disconnectedNodes.length > 0) {
      for (const node of disconnectedNodes) {
        warnings.push({
          type: 'warning',
          code: 'DISCONNECTED_NODE',
          message: `Node ${node.id} (${node.data.label}) is not connected to any other nodes`,
          nodeId: node.id
        })
      }
    }
    const nodesWithIncoming = new Set(this.edges.map(e => e.target))
    const entryPoints = this.nodes.filter(node => !nodesWithIncoming.has(node.id))
    if (entryPoints.length === 0 && this.nodes.length > 0) {
      warnings.push({
        type: 'warning',
        code: 'NO_ENTRY_POINT',
        message: 'Workflow has no clear entry point (all nodes have incoming connections)'
      })
    }
    const nodesWithOutgoing = new Set(this.edges.map(e => e.source))
    const exitPoints = this.nodes.filter(node => !nodesWithOutgoing.has(node.id))
    if (exitPoints.length === 0 && this.nodes.length > 1) {
      warnings.push({
        type: 'warning',
        code: 'NO_EXIT_POINT',
        message: 'Workflow has no clear exit point (all nodes have outgoing connections)'
      })
    }
  }
  private validateCycles(errors: ValidationError[], warnings: ValidationWarning[]): void {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const cycles: string[][] = []
    const detectCycleDFS = (nodeId: string, path: string[]): void => {
      if (recursionStack.has(nodeId)) {
        const cycleStart = path.indexOf(nodeId)
        const cycle = path.slice(cycleStart).concat([nodeId])
        cycles.push(cycle)
        return
      }
      if (visited.has(nodeId)) {
        return
      }
      visited.add(nodeId)
      recursionStack.add(nodeId)
      const outgoingEdges = this.edges.filter(edge => edge.source === nodeId)
      for (const edge of outgoingEdges) {
        detectCycleDFS(edge.target, [...path, nodeId])
      }
      recursionStack.delete(nodeId)
    }
    for (const node of this.nodes) {
      if (!visited.has(node.id)) {
        detectCycleDFS(node.id, [])
      }
    }
    for (const cycle of cycles) {
      const cycleDescription = cycle.map(nodeId => {
        const node = this.nodes.find(n => n.id === nodeId)
        return node?.data.label || nodeId
      }).join(' → ')
      warnings.push({
        type: 'warning',
        code: 'CYCLE_DETECTED',
        message: `Cycle detected in workflow: ${cycleDescription}`,
        details: { cycle }
      })
    }
  }
  private validateConfigurations(errors: ValidationError[], warnings: ValidationWarning[]): void {
    const agentNodes = this.nodes.filter(node => node.data.type === 'agent')
    for (let i = 0; i < agentNodes.length; i++) {
      for (let j = i + 1; j < agentNodes.length; j++) {
        const agent1 = agentNodes[i]
        const agent2 = agentNodes[j]
        if (agent1.data.config && agent2.data.config) {
          const config1 = JSON.stringify(agent1.data.config)
          const config2 = JSON.stringify(agent2.data.config)
          if (config1 === config2) {
            warnings.push({
              type: 'warning',
              code: 'DUPLICATE_AGENT_CONFIG',
              message: `Agents ${agent1.data.label} and ${agent2.data.label} have identical configurations`,
              details: { nodes: [agent1.id, agent2.id] }
            })
          }
        }
      }
    }
    for (const node of this.nodes) {
      if (node.data.type === 'agent' && node.data.config) {
        if (node.data.config.temperature < 0 || node.data.config.temperature > 2) {
          warnings.push({
            type: 'warning',
            code: 'INVALID_TEMPERATURE',
            message: `Agent ${node.data.label} has an unusual temperature setting: ${node.data.config.temperature}`,
            nodeId: node.id
          })
        }
        if (node.data.config.maxTokens <= 0) {
          errors.push({
            type: 'error',
            code: 'INVALID_MAX_TOKENS',
            message: `Agent ${node.data.label} has invalid maxTokens setting: ${node.data.config.maxTokens}`,
            nodeId: node.id
          })
        }
      }
    }
  }
  private generateSummary() {
    const agentNodes = this.nodes.filter(node => node.data.type === 'agent').length
    const toolNodes = this.nodes.filter(node => node.data.type === 'tool').length
    const handoffNodes = this.nodes.filter(node => node.data.type === 'handoff').length
    const connectedNodes = new Set<string>()
    for (const edge of this.edges) {
      connectedNodes.add(edge.source)
      connectedNodes.add(edge.target)
    }
    const disconnectedNodes = this.nodes.length - connectedNodes.size
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    let cyclesDetected = 0
    const hasCycleDFS = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        cyclesDetected++
        return true
      }
      if (visited.has(nodeId)) return false
      visited.add(nodeId)
      recursionStack.add(nodeId)
      const outgoingEdges = this.edges.filter(edge => edge.source === nodeId)
      for (const edge of outgoingEdges) {
        if (hasCycleDFS(edge.target)) {
          return true
        }
      }
      recursionStack.delete(nodeId)
      return false
    }
    for (const node of this.nodes) {
      if (!visited.has(node.id)) {
        hasCycleDFS(node.id)
      }
    }
    return {
      totalNodes: this.nodes.length,
      totalEdges: this.edges.length,
      agentNodes,
      toolNodes,
      handoffNodes,
      disconnectedNodes,
      cyclesDetected
    }
  }
}
export function validateWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): ValidationResult {
  const validator = new WorkflowValidator(nodes, edges)
  return validator.validate()
}