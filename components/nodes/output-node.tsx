"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "reactflow"
import { Wrench, Database, Cloud, FileText, Globe, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ToolNodeData } from "@/lib/types"

export const ToolNode = memo<NodeProps<ToolNodeData>>(({ data, isConnectable }) => {
  const getToolIcon = (source: string) => {
    switch (source) {
      case 'database':
        return Database
      case 'api':
        return Cloud
      case 'filesystem':
        return FileText
      case 'web':
        return Globe
      case 'mcp_tools':
        return Settings
      default:
        return Wrench
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle':
        return 'border-gray-400 bg-white shadow-md'
      case 'running':
        return 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-200/30 animate-pulse'
      case 'success':
        return 'border-green-500 bg-green-50 shadow-lg shadow-green-200/30'
      case 'error':
        return 'border-red-500 bg-red-50 shadow-lg shadow-red-200/30'
      default:
        return 'border-purple-400 bg-white shadow-md'
    }
  }

  const StatusIndicator = ({ status }: { status: string }) => {
    const getStatusInfo = () => {
      switch (status) {
        case 'idle':
          return {
            color: 'bg-gray-400',
            ring: 'ring-gray-300',
            glow: '',
            label: 'Ready'
          }
        case 'running':
          return {
            color: 'bg-blue-500 animate-pulse',
            ring: 'ring-blue-300 ring-2',
            glow: 'shadow-lg shadow-blue-400/50',
            label: 'Running'
          }
        case 'success':
          return {
            color: 'bg-green-500',
            ring: 'ring-green-300 ring-2',
            glow: 'shadow-md shadow-green-400/30',
            label: 'Success'
          }
        case 'error':
          return {
            color: 'bg-red-500',
            ring: 'ring-red-300 ring-2',
            glow: 'shadow-md shadow-red-400/30',
            label: 'Error'
          }
        default:
          return {
            color: 'bg-purple-500',
            ring: 'ring-purple-300 ring-1',
            glow: '',
            label: 'Ready'
          }
      }
    }

    const statusInfo = getStatusInfo()

    return (
      <div className="flex items-center gap-1">
        <div 
          className={`w-3 h-3 rounded-full transition-all duration-300 ${statusInfo.color} ${statusInfo.ring} ${statusInfo.glow}`} 
          title={`Tool Status: ${statusInfo.label}`}
        />
        <span className="text-xs font-medium text-gray-600">{statusInfo.label}</span>
      </div>
    )
  }

  const Icon = getToolIcon(data.source)

  // Handle MCP tools from parameters or fallback to mock tools
  const mcpTools = data.parameters?.tools
  
  return (
    <div className={cn(
      "px-4 py-3 shadow-lg rounded-lg border-2 transition-all duration-200 min-w-[200px]",
      getStatusColor(data.status)
    )}>
      <Handle 
        type="target" 
        position={Position.Left} 
        isConnectable={isConnectable} 
        className="w-3 h-3 bg-purple-600 border-2 border-white" 
      />
      
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-purple-600" />
          <div className="flex-1">
            <div className="font-medium text-sm text-gray-900">
              {data.label}
            </div>
            {data.description && (
              <div className="text-xs text-gray-600 mt-1">
                {data.description}
              </div>
            )}
          </div>
        </div>
        <StatusIndicator status={data.status || 'idle'} />
      </div>

      {/* MCP Tools Display */}
      {mcpTools && Array.isArray(mcpTools) && mcpTools.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-700 mb-2">Available MCP Tools:</div>
          <div className="space-y-1">
            {mcpTools.map((tool: any, index: number) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="font-medium text-blue-700">{tool.name}</span>
                {tool.description && (
                  <span className="text-gray-600 truncate">- {tool.description}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fallback for non-MCP tools */}
      {(!mcpTools || !Array.isArray(mcpTools) || mcpTools.length === 0) && data.source !== 'mcp_tools' && (
        <div className="mt-2 text-xs text-gray-600">
          Tool ID: {data.toolId}
        </div>
      )}
      
      <Handle 
        type="source" 
        position={Position.Right} 
        isConnectable={isConnectable} 
        className="w-3 h-3 bg-purple-600 border-2 border-white" 
      />
    </div>
  )
})

ToolNode.displayName = "ToolNode"