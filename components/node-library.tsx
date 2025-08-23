"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { User, Wrench, ArrowRightLeft } from "lucide-react"

const nodeTypes = [
  {
    type: "agent",
    label: "Agent Node",
    description: "AI Agent for processing tasks",
    icon: <User className="h-4 w-4 mr-2 text-blue-600" />,
    color: "border-blue-500 hover:border-blue-600",
  },
  {
    type: "tool",
    label: "Tool Node",
    description: "Tool or capability for agents",
    icon: <Wrench className="h-4 w-4 mr-2 text-green-600" />,
    color: "border-green-500 hover:border-green-600",
  },
  {
    type: "handoff",
    label: "Handoff Node",
    description: "Control between agents",
    icon: <ArrowRightLeft className="h-4 w-4 mr-2 text-purple-600" />,
    color: "border-purple-500 hover:border-purple-600",
  },
]

export default function NodeLibrary() {
  const onDragStart = (event: React.DragEvent<HTMLButtonElement>, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType)
    event.dataTransfer.effectAllowed = "move"
  }

  return (
    <div className="flex flex-col h-full">
      {/* Praxis Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">PRAXIS</h1>
        </div>
        <p className="text-sm text-gray-600">AI Workflow Orchestration Platform</p>
      </div>
      
      {/* Node Library Content */}
      <div className="flex-1 p-4 flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Node Library</h2>
        <div className="text-sm font-medium text-gray-700 mb-2">Available Nodes</div>
        {nodeTypes.map((node) => (
          <Button
            key={node.type}
            variant="outline"
            className={`justify-start text-left h-auto p-3 ${node.color} hover:shadow-md transition-all duration-200`}
            draggable
            onDragStart={(e) => onDragStart(e, node.type)}
          >
            {node.icon}
            <div className="flex flex-col items-start">
              <span className="font-medium">{node.label}</span>
              <span className="text-xs text-gray-500 mt-1">{node.description}</span>
            </div>
          </Button>
        ))}
        <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <strong>How to use:</strong><br />
          Drag and drop nodes onto the canvas to build your AI workflow. Connect nodes to create data flows between agents, tools, and handoff points.
        </div>
      </div>
    </div>
  )
}