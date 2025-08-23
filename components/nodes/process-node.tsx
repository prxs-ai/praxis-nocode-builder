"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "reactflow"
import { ArrowRightLeft, CheckCircle, AlertCircle, Clock, XCircle } from "lucide-react"
import type { HandoffNodeData } from "@/lib/types"

const ConditionIndicator = ({ condition }: { condition: HandoffNodeData['condition'] }) => {
  const getConditionInfo = () => {
    switch (condition) {
      case 'completion':
        return { icon: CheckCircle, label: 'On Complete', color: 'text-green-600 bg-green-100' }
      case 'condition':
        return { icon: AlertCircle, label: 'Condition', color: 'text-yellow-600 bg-yellow-100' }
      case 'error':
        return { icon: XCircle, label: 'On Error', color: 'text-red-600 bg-red-100' }
      case 'timeout':
        return { icon: Clock, label: 'Timeout', color: 'text-orange-600 bg-orange-100' }
      default:
        return { icon: ArrowRightLeft, label: 'Handoff', color: 'text-purple-600 bg-purple-100' }
    }
  }

  const { icon: Icon, label, color } = getConditionInfo()

  return (
    <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </div>
  )
}

const NodeStatusIndicator = ({ status }: { status: HandoffNodeData['status'] }) => {
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
          label: 'Processing'
        }
      case 'success':
        return {
          color: 'bg-green-500',
          ring: 'ring-green-300 ring-2',
          glow: 'shadow-md shadow-green-400/30',
          label: 'Complete'
        }
      case 'error':
        return {
          color: 'bg-red-500',
          ring: 'ring-red-300 ring-2',
          glow: 'shadow-md shadow-red-400/30',
          label: 'Failed'
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
        title={`Status: ${statusInfo.label}`}
      />
      <span className="text-xs font-medium text-gray-600">{statusInfo.label}</span>
    </div>
  )
}

export const HandoffNode = memo(({ data, isConnectable }: NodeProps<HandoffNodeData>) => {
  if (data.type !== 'handoff') {
    return null
  }

  const getNodeBorderColor = (status: HandoffNodeData['status']) => {
    switch (status) {
      case 'idle':
        return 'border-gray-400 bg-white shadow-md'
      case 'running':
        return 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-200/30'
      case 'success':
        return 'border-green-500 bg-green-50 shadow-lg shadow-green-200/30'
      case 'error':
        return 'border-red-500 bg-red-50 shadow-lg shadow-red-200/30'
      default:
        return 'border-purple-500 bg-white shadow-lg'
    }
  }

  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 transition-all duration-300 min-w-[300px] max-w-[340px] ${getNodeBorderColor(data.status)}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center flex-1 min-w-0">
          <div className="rounded-full w-8 h-8 flex items-center justify-center bg-purple-100 text-purple-600 flex-shrink-0">
            <ArrowRightLeft className="h-4 w-4" />
          </div>
          <div className="ml-2 flex-1 min-w-0">
            <div className="text-sm font-bold text-gray-800 truncate" title={data.label}>{data.label}</div>
            <div className="text-xs text-gray-500">Control Transfer</div>
          </div>
        </div>
        <div className="flex-shrink-0 ml-2 space-y-1">
          <NodeStatusIndicator status={data.status || 'idle'} />
          <ConditionIndicator condition={data.condition} />
        </div>
      </div>

      {data.description && (
        <div className="text-xs text-gray-600 mb-2 break-words hyphens-auto leading-relaxed max-w-full">
          {data.description.length > 100 ? (
            <span title={data.description}>
              {data.description.substring(0, 100)}...
            </span>
          ) : (
            data.description
          )}
        </div>
      )}

      <div className="mt-2 text-xs bg-purple-50 p-2 rounded border-l-2 border-purple-300">
        <div className="font-medium text-purple-700 mb-1">Routing</div>
        {data.routing.targetAgent && (
          <div className="text-purple-600 mt-1 break-words hyphens-auto max-w-full">
            <span className="font-medium">Target:</span> {data.routing.targetAgent.length > 25 ? (
              <span title={data.routing.targetAgent}>
                {data.routing.targetAgent.substring(0, 25)}...
              </span>
            ) : (
              data.routing.targetAgent
            )}
          </div>
        )}
        {data.routing.fallbackAgent && (
          <div className="text-purple-600 break-words hyphens-auto max-w-full">
            <span className="font-medium">Fallback:</span> {data.routing.fallbackAgent.length > 25 ? (
              <span title={data.routing.fallbackAgent}>
                {data.routing.fallbackAgent.substring(0, 25)}...
              </span>
            ) : (
              data.routing.fallbackAgent
            )}
          </div>
        )}
      </div>

      {data.routing.context && Object.keys(data.routing.context).length > 0 && (
        <div className="mt-2 text-xs text-gray-500 overflow-hidden">
          <div className="font-medium">Context:</div>
          <div className="bg-gray-50 p-1 rounded mt-1 truncate">
            {Object.keys(data.routing.context).length} parameters
          </div>
        </div>
      )}

      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable} 
        className="w-3 h-3 bg-purple-600 border-2 border-white" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable} 
        className="w-3 h-3 bg-purple-600 border-2 border-white" 
      />
    </div>
  )
})

HandoffNode.displayName = "HandoffNode"
