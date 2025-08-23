"use client"

import type React from "react"
import { useState, useCallback, useRef, useEffect } from "react"
import { ReactFlow, Controls, MiniMap, Background, useNodesState, useEdgesState, ReactFlowProvider, Panel, Node, Edge, addEdge, Connection } from "reactflow"
import "reactflow/dist/style.css"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { Play, Trash2, BookOpen, Terminal, X, Download, FileInput, FileOutput } from "lucide-react"
import * as yaml from 'js-yaml'

import NodeLibrary from "./node-library"
import NodeConfigPanel from "./node-config-panel"
import CustomEdge from "./custom-edge"
import { AgentNode } from "./nodes/input-node"
import { ToolNode } from "./nodes/output-node"
import { HandoffNode } from "./nodes/process-node"
import { generateNodeId, createNode, resetNodeCounters } from "@/lib/workflow-utils"
import type { WorkflowNode, WorkflowEdge, DSLAnalysisResult } from "@/lib/types"
import { sampleWorkflows } from "@/lib/sample-workflows"
import WorkflowChat from "./workflow-chat"
import { getWebSocketClient } from "@/lib/websocket-client"

const nodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
  handoff: HandoffNode,
}

const edgeTypes = {
  custom: CustomEdge,
}

export default function WorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null)
  const [isExecuting, setIsExecuting] = useState<boolean>(false)
  interface ExecutionLog {
    id: string
    message: string
    timestamp: Date
    type: 'info' | 'success' | 'error' | 'warning' | 'system'
    nodeId?: string
    source?: string
  }

  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([])
  const [showLogs, setShowLogs] = useState<boolean>(false)
  const [logsFilter, setLogsFilter] = useState<'all' | 'info' | 'success' | 'error' | 'warning' | 'system'>('all')
  const [dslResult, setDslResult] = useState<DSLAnalysisResult | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const wsClient = getWebSocketClient()

  const { toast } = useToast()

  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (logsEndRef.current && isExecuting) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [executionLogs, isExecuting])

  // WebSocket listener for DSL workflow creation
  useEffect(() => {
    const unsubscribeCreateWorkflow = wsClient.on('createWorkflowFromDSL', (result: DSLAnalysisResult) => {
      setDslResult(result)
      if (result.success && result.workflowSuggestion) {
        createWorkflowFromDSL(result)
      }
    })

    const unsubscribeWorkflowStatus = wsClient.on('workflowStatus', (status: any) => {
      if (status.nodeId) {
        updateNodeStatus(status.nodeId, status.status)
      }
      if (status.message) {
        addExecutionLog(status.message, 'info', status.nodeId, 'workflow')
      }
    })

    const unsubscribeExecutionLog = wsClient.on('executionLog', (log: { message: string, type?: string, nodeId?: string, timestamp?: string }) => {
      addExecutionLog(log.message, (log.type as ExecutionLog['type']) || 'info', log.nodeId, 'system')
    })

    const unsubscribeWorkflowComplete = wsClient.on('workflowComplete', (result: any) => {
      setIsExecuting(false)
      addExecutionLog(`Workflow execution completed: ${result.message || 'Success'}`, 'success', undefined, 'workflow')
      
      toast({
        title: "Workflow Completed",
        description: result.message || "Workflow execution finished successfully",
      })
    })

    const unsubscribeWorkflowError = wsClient.on('workflowError', (error: any) => {
      setIsExecuting(false)
      addExecutionLog(`Workflow error: ${error.message || 'Unknown error'}`, 'error', undefined, 'workflow')
      
      toast({
        title: "Workflow Error",
        description: error.message || "An error occurred during workflow execution",
        variant: "destructive",
      })
    })

    // Add handlers for backend logs
    const unsubscribeSystemLog = wsClient.on('SYSTEM_LOG', (log: any) => {
      const message = log.data?.message || log.message || 'System log'
      const level = log.data?.level || log.level || 'info'
      const type = level === 'error' ? 'error' : level === 'warn' ? 'warning' : 'info'
      addExecutionLog(`[System] ${message}`, type as ExecutionLog['type'], undefined, 'backend')
    })

    const unsubscribeAgentLog = wsClient.on('AGENT_LOG', (log: any) => {
      const agentId = log.data?.agent_id || log.agent_id || 'unknown'
      const message = log.data?.message || log.message || 'Agent log'
      const level = log.data?.level || log.level || 'info'
      const type = level === 'error' ? 'error' : level === 'warn' ? 'warning' : 'info'
      addExecutionLog(`[Agent: ${agentId}] ${message}`, type as ExecutionLog['type'], agentId, 'agent')
    })

    const unsubscribeNodeStatusUpdate = wsClient.on('nodeStatusUpdate', (update: any) => {
      console.log('Node status update received:', update)
      if (update.nodeId && update.status) {
        updateNodeStatus(update.nodeId, update.status)
        addExecutionLog(`Node ${update.nodeId} status: ${update.status}`, 'info', update.nodeId, 'system')
      }
    })

    return () => {
      unsubscribeCreateWorkflow()
      unsubscribeWorkflowStatus()
      unsubscribeExecutionLog()
      unsubscribeWorkflowComplete()
      unsubscribeWorkflowError()
      unsubscribeSystemLog()
      unsubscribeAgentLog()
      unsubscribeNodeStatusUpdate()
    }
  }, [wsClient])

  const createWorkflowFromDSL = useCallback((result: DSLAnalysisResult) => {
    if (!result.success) return
    
    setNodes([])
    setEdges([])
    resetNodeCounters()
    
    const newNodes: WorkflowNode[] = []
    const newEdges: WorkflowEdge[] = []
    
    // Create orchestrator node (the requesting agent)
    const orchestratorNode = createNode({
      type: 'agent',
      position: { x: 200, y: 150 },
      id: generateNodeId('agent')
    }) as WorkflowNode
    
    orchestratorNode.data = {
      ...orchestratorNode.data,
      label: 'Orchestrator Agent',
      description: 'Local agent coordinating the workflow',
      status: 'idle',
      agentName: 'orchestrator',
      isOrchestrator: true
    }
    newNodes.push(orchestratorNode)
    
    let lastAgentNode: WorkflowNode = orchestratorNode
    
    // Create P2P agent nodes for matched agents
    if (result.matchedAgents && result.matchedAgents.length > 0) {
      // Support multiple matched agents for more complex workflows
      result.matchedAgents.forEach((match: any, index: number) => {
        const agentName = match.agentName || match.agent_name || `P2P Agent ${index + 1}`
        
        // Skip orchestrator agents
        if (agentName === 'orchestrator' || agentName === 'go-agent-1') {
          return
        }
        
        const p2pAgentNode = createNode({
          type: 'agent',
          position: { x: 550 + (index * 200), y: 150 + (index * 100) },
          id: generateNodeId('agent')
        }) as WorkflowNode
        
        p2pAgentNode.data = {
          ...p2pAgentNode.data,
          label: agentName,
          description: match.reasoning || `P2P Agent with capabilities: ${match.matchedTools?.join(', ') || 'various'}`,
          status: 'idle',
          agentName: agentName,
          matchScore: match.matchScore || match.match_score,
          matchedSkills: match.matchedSkills || match.matched_skills,
          matchedTools: match.matchedTools || match.matched_tools,
          isP2PAgent: true
        }
        newNodes.push(p2pAgentNode)
        
        // Connect orchestrator or previous agent to this P2P agent
        const edge: WorkflowEdge = {
          id: `edge-${lastAgentNode.id}-${p2pAgentNode.id}`,
          source: lastAgentNode.id,
          target: p2pAgentNode.id,
          type: 'custom',
          data: {
            label: index === 0 ? 'P2P Request' : 'Delegate',
            description: index === 0 
              ? `Orchestrator requests execution from P2P agent via libp2p`
              : `Agent delegates to next P2P agent`,
            source: lastAgentNode.id,
            target: p2pAgentNode.id,
            isP2P: true
          }
        }
        newEdges.push(edge)
        
        lastAgentNode = p2pAgentNode
      })
    } else {
      // No matching agents found - try to use any available agent from the result
      // or fallback to a default P2P agent
      let defaultAgentName = 'go-agent-2' // fallback name
      
      // Try to find any available agent in the result
      if (result.availableAgents && result.availableAgents.length > 0) {
        // Use the first available agent that isn't the orchestrator
        const availableP2PAgent = result.availableAgents.find(
          (agent: any) => agent.agentName !== 'orchestrator' && agent.agent_name !== 'orchestrator'
        )
        if (availableP2PAgent) {
          defaultAgentName = availableP2PAgent.agentName || availableP2PAgent.agent_name || defaultAgentName
        }
      }
      
      const defaultP2PAgent = createNode({
        type: 'agent',
        position: { x: 550, y: 150 },
        id: generateNodeId('agent')
      }) as WorkflowNode
      
      defaultP2PAgent.data = {
        ...defaultP2PAgent.data,
        label: 'P2P Executor',
        description: `P2P Agent with MCP tools: ${result.requiredMCPTools?.map(t => t.name).join(', ') || 'filesystem'}`,
        status: 'idle',
        agentName: defaultAgentName,
        requiredTools: result.requiredMCPTools || [],
        isP2PAgent: true
      }
      newNodes.push(defaultP2PAgent)
      
      // Connect orchestrator to P2P agent
      const edge: WorkflowEdge = {
        id: `edge-${orchestratorNode.id}-${defaultP2PAgent.id}`,
        source: orchestratorNode.id,
        target: defaultP2PAgent.id,
        type: 'custom',
        data: {
          label: 'P2P Channel',
          description: 'Orchestrator delegates to P2P agent',
          source: orchestratorNode.id,
          target: defaultP2PAgent.id,
          isP2P: true
        }
      }
      newEdges.push(edge)
      lastAgentNode = defaultP2PAgent
    }
    
    // Always create separate tool node for MCP tools if they are required
    if (result.requiredMCPTools && result.requiredMCPTools.length > 0) {
      const toolNodeId = generateNodeId('tool')
      const toolNode: WorkflowNode = createNode({
        type: 'tool',
        position: { x: 750, y: 300 },
        id: toolNodeId
      })
      
      // Override the default data with MCP-specific configuration
      toolNode.data = {
        ...toolNode.data,
        label: `MCP Tools: ${result.requiredMCPTools.map(tool => tool.name).join(', ')}`,
        source: 'mcp_tools' as const,
        toolId: result.requiredMCPTools[0].name, // Use first tool as primary ID
        parameters: {
          tools: result.requiredMCPTools,
          toolCount: result.requiredMCPTools.length
        },
        description: `Available MCP tools for ${lastAgentNode.data.label}`,
        status: 'idle'
      }
      newNodes.push(toolNode)
      
      // Connect the last agent node to tools
      const toolEdge: WorkflowEdge = {
        id: `edge-${lastAgentNode.id}-${toolNode.id}`,
        source: lastAgentNode.id,
        target: toolNode.id,
        type: 'custom',
        data: {
          label: 'Uses Tools',
          description: 'Agent can access these MCP tools',
          source: lastAgentNode.id,
          target: toolNode.id
        }
      }
      newEdges.push(toolEdge)
    }
    
    // Set the new workflow
    setNodes(newNodes)
    setEdges(newEdges)
    
    // Send workflow creation message to chat
    const workflowSummary = generateWorkflowCreationMessage(newNodes, newEdges, result)
    wsClient.emit('addAssistantMessage', { content: workflowSummary, type: 'system' })
    
    toast({
      title: "Workflow created from DSL",
      description: `Generated workflow with ${newNodes.length} nodes and ${newEdges.length} connections`,
    })
    
    // Note: Auto-execution will be handled by workflow orchestrator
  }, [setNodes, setEdges, toast, wsClient])

  const generateWorkflowCreationMessage = (nodes: WorkflowNode[], edges: WorkflowEdge[], result: DSLAnalysisResult): string => {
    const agentNodes = nodes.filter(node => node.type === 'agent')
    const toolNodes = nodes.filter(node => node.type === 'tool')
    const agentCount = agentNodes.length
    const toolCount = toolNodes.length
    const connectionCount = edges.length
    
    let message = `🎯 P2P Workflow created! 📊 DSL Command: "${result.command}"\n`
    message += `📋 Network Structure: • ${agentCount} P2P Agents • ${toolCount} Tool nodes • ${connectionCount} P2P Connections\n`
    
    if (agentNodes.length > 0) {
      message += `🤝 P2P Agents: `
      agentNodes.forEach((node, index) => {
        message += `${index + 1}. ${node.data.label}: ${node.data.description} `
      })
    }
    
    if (result.requiredMCPTools && result.requiredMCPTools.length > 0) {
      message += `\n📦 MCP Tools available: ${result.requiredMCPTools.map(t => t.name).join(', ')}`
    }
    
    message += `\n🚀 P2P network ready for execution...`
    
    return message
  }

  const exportWorkflow = (format: 'json' | 'yaml') => {
    if (nodes.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Add some nodes to your workflow first",
        variant: "destructive",
      })
      return
    }

    const workflow = {
      name: 'Exported Workflow',
      description: 'Workflow exported from Praxis',
      version: '1.0.0',
      nodes,
      edges,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        exportedAt: new Date().toISOString(),
        format
      }
    }

    let content: string
    let mimeType: string
    let filename: string

    if (format === 'yaml') {
      // Proper YAML serialization using js-yaml
      content = yaml.dump(workflow, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false
      })
      mimeType = 'application/x-yaml'
      filename = `workflow-${Date.now()}.yaml`
    } else {
      content = JSON.stringify(workflow, null, 2)
      mimeType = 'application/json'
      filename = `workflow-${Date.now()}.json`
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Workflow exported",
      description: `Workflow saved as ${filename}`,
    })
  }

  const importWorkflow = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.yaml,.yml'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const content = await file.text()
        let workflow: any

        if (file.name.endsWith('.json')) {
          workflow = JSON.parse(content)
        } else if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
          // Parse YAML using js-yaml
          workflow = yaml.load(content) as any
        }

        if (workflow.nodes && workflow.edges) {
          setNodes(workflow.nodes)
          setEdges(workflow.edges)
          resetNodeCounters()
          
          toast({
            title: "Workflow imported",
            description: `Successfully imported ${workflow.nodes.length} nodes and ${workflow.edges.length} connections`,
          })
        } else {
          throw new Error('Invalid workflow format')
        }
      } catch (error) {
        toast({
          title: "Import failed",
          description: "Failed to parse workflow file. Please check the format.",
          variant: "destructive",
        })
      }
    }
    
    input.click()
  }

  const getExecutionOrder = () => {
    // Simple topological sort to determine execution order
    const nodeMap = new Map(nodes.map(node => [node.id, node]))
    const inDegree = new Map(nodes.map(node => [node.id, 0]))
    const adjList = new Map(nodes.map(node => [node.id, []]))

    // Build adjacency list and calculate in-degrees
    edges.forEach(edge => {
      adjList.get(edge.source)?.push(edge.target)
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
    })

    // Topological sort using Kahn's algorithm
    const queue = nodes.filter(node => inDegree.get(node.id) === 0).map(node => node.id)
    const result = []

    while (queue.length > 0) {
      const current = queue.shift()!
      result.push(current)

      adjList.get(current)?.forEach(neighbor => {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1)
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor)
        }
      })
    }

    return result
  }

  const executeWorkflow = async () => {
    if (nodes.length === 0) {
      toast({
        title: "Nothing to execute",
        description: "Add some nodes to your workflow first",
        variant: "destructive",
      })
      return
    }

    if (isExecuting) {
      toast({
        title: "Already executing",
        description: "Please wait for the current execution to complete",
        variant: "destructive",
      })
      return
    }

    setIsExecuting(true)
    setExecutionLogs([])
    setShowLogs(true)
    addExecutionLog("🚀 Starting workflow execution...", 'system', undefined, 'workflow')

    // Reset all nodes to idle status
    nodes.forEach(node => updateNodeStatus(node.id, 'idle'))

    const workflowId = `workflow_${Date.now()}`
    const agentNodes = nodes.filter(node => node.type === 'agent').length
    const toolNodes = nodes.filter(node => node.type === 'tool').length
    const handoffNodes = nodes.filter(node => node.type === 'handoff').length

    addExecutionLog(`🚀 Starting workflow execution: ${workflowId}`)
    addExecutionLog(`📊 Processing ${agentNodes} agents, ${toolNodes} tools, and ${handoffNodes} handoffs`)
    addExecutionLog(`🔗 Workflow contains ${edges.length} connections`)
    
    // Log connection details
    edges.forEach((edge, index) => {
      const sourceNode = nodes.find(n => n.id === edge.source)
      const targetNode = nodes.find(n => n.id === edge.target)
      addExecutionLog(
        `📌 Connection ${index + 1}: ${sourceNode?.data.label || edge.source} → ${targetNode?.data.label || edge.target}`,
        'info',
        undefined,
        'workflow'
      )
    })

    toast({
      title: "Executing AI workflow",
      description: `Starting real workflow execution with ${nodes.length} nodes`,
    })

    try {
      // Send workflow execution request via WebSocket
      const executionPayload = {
        workflowId: workflowId,
        nodes: nodes,
        edges: edges,
        metadata: {
          name: 'Interactive Workflow',
          description: 'Workflow created and executed from UI',
          version: '1.0.0',
          createdAt: new Date().toISOString()
        }
      }

      const sent = wsClient.sendMessage('EXECUTE_WORKFLOW', executionPayload)
      
      if (sent) {
        addExecutionLog(`📡 Workflow execution request sent to backend`)
        addExecutionLog(`⏳ Waiting for execution status updates...`)
      } else {
        throw new Error('Failed to send workflow execution request')
      }
    } catch (error) {
      setIsExecuting(false)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      addExecutionLog(`❌ Execution failed: ${errorMessage}`)
      
      toast({
        title: "Execution Failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const updateNodeStatus = (nodeId: string, status: 'idle' | 'running' | 'success' | 'error') => {
    setNodes(nodes => 
      nodes.map(node => 
        node.id === nodeId
          ? { ...node, data: { ...node.data, status } }
          : node
      )
    )
  }

  const addExecutionLog = (message: string, type: ExecutionLog['type'] = 'info', nodeId?: string, source?: string) => {
    const newLog: ExecutionLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      timestamp: new Date(),
      type,
      nodeId,
      source
    }
    setExecutionLogs(logs => [...logs, newLog])
  }

  const clearExecutionLogs = () => {
    setExecutionLogs([])
  }

  const getFilteredLogs = () => {
    if (logsFilter === 'all') return executionLogs
    return executionLogs.filter(log => log.type === logsFilter)
  }

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData("application/reactflow")
      if (typeof type === "undefined" || !type) {
        return
      }

      const position = { x: event.clientX - 100, y: event.clientY - 100 }
      const newNode = createNode({
        type,
        position,
        id: generateNodeId(type)
      })

      setNodes((nds) => nds.concat(newNode))
    },
    [setNodes]
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node as WorkflowNode)
  }, [])

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: WorkflowEdge = {
        id: `edge-${params.source}-${params.target}`,
        source: params.source!,
        target: params.target!,
        type: 'custom',
        data: {
          label: 'Manual Connection',
          description: 'User created connection',
          source: params.source,
          target: params.target
        }
      }
      setEdges((eds) => addEdge(newEdge, eds))
      
      // Send WebSocket event for real-time updates
      wsClient.emit('edgeAdded', {
        edge: newEdge,
        timestamp: new Date().toISOString()
      })
      
      toast({
        title: "Connection Created",
        description: `Connected ${params.source} to ${params.target}`,
      })
    },
    [setEdges, wsClient, toast]
  )


  const loadSampleWorkflow = useCallback((workflowName: string) => {
    const workflow = sampleWorkflows[workflowName]
    if (workflow) {
      setNodes(workflow.nodes)
      setEdges(workflow.edges)
      resetNodeCounters()
      toast({
        title: "Sample workflow loaded",
        description: `${workflow.name} loaded with ${workflow.nodes.length} nodes`,
      })
    }
  }, [setNodes, setEdges, toast])

  const clearCanvas = useCallback(() => {
    setNodes([])
    setEdges([])
    setSelectedNode(null)
    resetNodeCounters()
    toast({
      title: "Canvas cleared",
      description: "All nodes and edges have been removed",
    })
  }, [setNodes, setEdges, toast])

  // Test function to animate connections
  const testAnimation = useCallback(() => {
    if (nodes.length < 2) {
      toast({
        title: "Not enough nodes",
        description: "Add at least 2 nodes to test animation",
        variant: "destructive",
      })
      return
    }

    // Simulate workflow execution animation
    let currentIndex = 0
    const animationInterval = setInterval(() => {
      if (currentIndex >= nodes.length) {
        clearInterval(animationInterval)
        // Reset all nodes to idle after animation
        setTimeout(() => {
          nodes.forEach(node => updateNodeStatus(node.id, 'idle'))
        }, 2000)
        return
      }

      const node = nodes[currentIndex]
      updateNodeStatus(node.id, 'running')
      
      // Mark previous node as success after a delay
      if (currentIndex > 0) {
        setTimeout(() => {
          updateNodeStatus(nodes[currentIndex - 1].id, 'success')
        }, 1000)
      }

      currentIndex++
    }, 2000)

    toast({
      title: "Testing animation",
      description: "Watch the nodes and connections animate",
    })
  }, [nodes, updateNodeStatus, toast])

  return (
    <div className="w-full h-screen flex bg-gray-50 relative">
      {/* Node Library Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <NodeLibrary />
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            className="bg-gray-100"
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            connectionLineType="smoothstep"
            connectionLineStyle={{ stroke: '#3B82F6', strokeWidth: 2 }}
            maxZoom={2}
            minZoom={0.1}
            fitView={false}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            selectNodesOnDrag={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls />
            <MiniMap />
            
            <Panel position="top-left">
              <div className="text-xs text-gray-600 bg-white/80 backdrop-blur-sm p-2 rounded-md border border-gray-200">
                Nodes: {nodes.length} | Edges: {edges.length}
                {isExecuting && (
                  <span className="ml-2 text-blue-600 font-medium">
                    ⚡ Executing...
                  </span>
                )}
              </div>
            </Panel>

            <Panel position="top-center">
              <div className="text-lg font-bold text-gray-800 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                PRAXIS
              </div>
            </Panel>

            <Panel position="top-right">
              <div className="flex gap-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-gray-200">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="hover:bg-orange-50">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => exportWorkflow('json')}>
                      <FileOutput className="h-4 w-4 mr-2" />
                      Export as JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportWorkflow('yaml')}>
                      <FileOutput className="h-4 w-4 mr-2" />
                      Export as YAML
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={importWorkflow} size="sm" variant="outline" className="hover:bg-teal-50">
                  <FileInput className="h-4 w-4 mr-2" />
                  Import (JSON/YAML)
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="hover:bg-purple-50">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Samples
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => loadSampleWorkflow('customerSupport')}>
                      Customer Support Flow
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => loadSampleWorkflow('qaFlow')}>
                      Simple Q&A Flow
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => loadSampleWorkflow('socialMediaNetwork')}>
                      Social Media Network
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => loadSampleWorkflow('tradingBotNetwork')}>
                      Trading Bot Network
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => loadSampleWorkflow('contentDistribution')}>
                      Content Distribution
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => loadSampleWorkflow('cryptoResearch')}>
                      Crypto Research
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => loadSampleWorkflow('nftLaunch')}>
                      NFT Launch Workflow
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => loadSampleWorkflow('hypeGuard')}>
                      HypeGuard Workflow
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={clearCanvas} size="sm" variant="outline" className="hover:bg-red-50 text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                <Button onClick={testAnimation} size="sm" variant="outline" className="hover:bg-orange-50 text-orange-600 hover:text-orange-700">
                  ⚡ Test Animation
                </Button>
                <Button onClick={executeWorkflow} size="sm" variant="default" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" disabled={isExecuting}>
                  <Play className="h-4 w-4 mr-2" />
                  {isExecuting ? "Executing..." : "Execute"}
                </Button>
                {executionLogs.length > 0 && (
                  <Button onClick={() => setShowLogs(!showLogs)} size="sm" variant="outline" className="hover:bg-gray-50">
                    <Terminal className="h-4 w-4 mr-2" />
                    {showLogs ? "Hide Logs" : "Show Logs"}
                  </Button>
                )}
              </div>
            </Panel>
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {/* Execution Logs Panel */}
      {showLogs && executionLogs.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 z-50">
          <Card className="max-w-4xl mx-auto bg-gray-950/95 backdrop-blur-sm text-gray-100 font-mono border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    Execution Logs ({getFilteredLogs().length})
                  </h3>
                  <select
                    value={logsFilter}
                    onChange={(e) => setLogsFilter(e.target.value as any)}
                    className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-200"
                  >
                    <option value="all">All</option>
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="error">Error</option>
                    <option value="warning">Warning</option>
                    <option value="system">System</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={clearExecutionLogs}
                    size="sm"
                    variant="ghost"
                    className="text-gray-400 hover:text-white"
                    title="Clear logs"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={() => setShowLogs(false)}
                    size="sm"
                    variant="ghost"
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 text-xs bg-gray-900/50 p-3 rounded border border-gray-700">
                {getFilteredLogs().map((log) => {
                  const getLogStyles = (type: ExecutionLog['type']) => {
                    switch (type) {
                      case 'success':
                        return 'text-green-400 border-l-green-500'
                      case 'error':
                        return 'text-red-400 border-l-red-500'
                      case 'warning':
                        return 'text-yellow-400 border-l-yellow-500'
                      case 'system':
                        return 'text-blue-400 border-l-blue-500'
                      default:
                        return 'text-gray-300 border-l-gray-500'
                    }
                  }

                  const getLogIcon = (type: ExecutionLog['type']) => {
                    switch (type) {
                      case 'success':
                        return '✅'
                      case 'error':
                        return '❌'
                      case 'warning':
                        return '⚠️'
                      case 'system':
                        return '🔧'
                      default:
                        return 'ℹ️'
                    }
                  }

                  return (
                    <div 
                      key={log.id} 
                      className={`opacity-90 hover:opacity-100 border-l-2 pl-3 py-1 transition-all duration-200 ${getLogStyles(log.type)}`}
                      title={`${log.source || 'unknown'} - ${log.timestamp.toLocaleString()}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0">{getLogIcon(log.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-400">
                              {log.timestamp.toLocaleTimeString()}
                            </span>
                            {log.nodeId && (
                              <span className="text-gray-500 bg-gray-800 px-1 rounded text-xs">
                                {log.nodeId.substring(0, 8)}
                              </span>
                            )}
                            {log.source && (
                              <span className="text-gray-500 text-xs">
                                [{log.source}]
                              </span>
                            )}
                          </div>
                          <div className="mt-1 break-words">
                            {log.message}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={logsEndRef} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Node Configuration Panel */}
      {selectedNode && (
        <div className="absolute top-4 right-4 z-40 w-80 max-h-[80vh] bg-white rounded-lg shadow-xl border border-gray-200 p-4 overflow-hidden">
          <NodeConfigPanel 
            node={selectedNode} 
            onClose={() => setSelectedNode(null)}
            updateNodeData={(nodeId, data) => {
              setNodes(nodes =>
                nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)
              )
              // Update selected node to reflect changes
              setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, ...data } } : null)
              
              // Send WebSocket event for real-time updates
              wsClient.emit('nodeUpdated', {
                nodeId,
                data,
                timestamp: new Date().toISOString()
              })
              
              toast({
                title: "Node Updated",
                description: `Configuration updated for node ${nodeId}`,
              })
            }}
          />
        </div>
      )}

      {/* Workflow Chat */}
      <WorkflowChat onCreateWorkflow={createWorkflowFromDSL} />
    </div>
  )
}