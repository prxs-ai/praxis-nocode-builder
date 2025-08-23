"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "reactflow"
import { GitBranch } from "lucide-react"
import type { NodeData } from "@/lib/types"

export const ConditionalNode = memo(({ data, isConnectable }: NodeProps<NodeData>) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-amber-500 min-w-[150px]">
      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-amber-100 text-amber-500">
          <GitBranch className="h-4 w-4" />
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold">{data.label || "Conditional"}</div>
          <div className="text-xs text-gray-500">{data.description || "Conditional branching"}</div>
        </div>
      </div>

      {data.condition && <div className="mt-2 text-xs bg-gray-100 p-1 rounded">Condition: {data.condition}</div>}

      <div className="flex justify-between mt-2 text-xs">
        <div className="text-green-600">{data.trueLabel || "Yes"}</div>
        <div className="text-red-600">{data.falseLabel || "No"}</div>
      </div>

      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-3 h-3 bg-amber-500" />
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: "25%" }}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: "75%" }}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-red-500"
      />
    </div>
  )
})

ConditionalNode.displayName = "ConditionalNode"
