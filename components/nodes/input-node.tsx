"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "reactflow"
import { User } from "lucide-react"
import type { AgentNodeData } from "@/lib/types"

const StatusIndicator = ({ status }: { status: AgentNodeData['status'] }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'idle':
        return {
          color: 'bg-gray-400',
          ring: 'ring-gray-300',
          glow: '',
          label: 'Idle'
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
          color: 'bg-gray-400',
          ring: 'ring-gray-300',
          glow: '',
          label: 'Unknown'
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`w-4 h-4 rounded-full transition-all duration-300 ${statusInfo.color} ${statusInfo.ring} ${statusInfo.glow}`} 
        title={`Status: ${statusInfo.label}`}
      />
      <span className="text-xs font-medium text-gray-600">{statusInfo.label}</span>
    </div>
  )
}

export const AgentNode = memo(({ data, isConnectable }: NodeProps<AgentNodeData>) => {
  if (data.type !== 'agent') {
    return null
  }

  const getNodeBorderColor = (status: AgentNodeData['status']) => {
    switch (status) {
      case 'idle':
        return 'border-gray-400 bg-white'
      case 'running':
        return 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-200/30'
      case 'success':
        return 'border-green-500 bg-green-50 shadow-lg shadow-green-200/30'
      case 'error':
        return 'border-red-500 bg-red-50 shadow-lg shadow-red-200/30'
      default:
        return 'border-blue-500 bg-white'
    }
  }

  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 transition-all duration-300 min-w-[240px] max-w-[300px] ${getNodeBorderColor(data.status)}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div className="rounded-full w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600">
            <User className="h-4 w-4" />
          </div>
          <div className="ml-2">
            <div className="text-sm font-bold text-gray-800">{data.label}</div>
            <div className="text-xs text-gray-500">{data.config.name}</div>
          </div>
        </div>
        <StatusIndicator status={data.status} />
      </div>

      {data.description && (
        <div className="text-xs text-gray-600 mb-2 break-words">{data.description}</div>
      )}

      <div className="mt-2 text-xs bg-blue-50 p-2 rounded border-l-2 border-blue-300">
        <div className="font-medium text-blue-700">Model: {data.config.model}</div>
        <div className="text-blue-600">Temp: {data.config.temperature} | Max: {data.config.maxTokens}</div>
      </div>

      {data.config.systemPrompt && (
        <div className="mt-2 text-xs text-gray-500 truncate" title={data.config.systemPrompt}>
          {data.config.systemPrompt.length > 40 
            ? `${data.config.systemPrompt.substring(0, 40)}...` 
            : data.config.systemPrompt}
        </div>
      )}

      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable} 
        className="w-3 h-3 bg-blue-600 border-2 border-white" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable} 
        className="w-3 h-3 bg-blue-600 border-2 border-white" 
      />
    </div>
  )
})

AgentNode.displayName = "AgentNode"
