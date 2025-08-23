"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { WorkflowNode, AgentNodeData, ToolNodeData, HandoffNodeData } from "@/lib/types"
import { AVAILABLE_MODELS, MOCK_TOOLS } from "@/lib/types"

interface NodeConfigPanelProps {
  node: WorkflowNode
  updateNodeData: (nodeId: string, data: any) => void
  onClose: () => void
}

export default function NodeConfigPanel({ node, updateNodeData, onClose }: NodeConfigPanelProps) {
  const [localData, setLocalData] = useState({ ...node.data })

  useEffect(() => {
    setLocalData({ ...node.data })
  }, [node.id, node.data])

  const handleChange = (key: string, value: any) => {
    const newData = { ...localData, [key]: value }
    setLocalData(newData)
    updateNodeData(node.id, { [key]: value })
  }

  const handleNestedChange = (parentKey: string, childKey: string, value: any) => {
    const newData = {
      ...localData,
      [parentKey]: {
        ...(localData as any)[parentKey],
        [childKey]: value,
      },
    }
    setLocalData(newData)
    updateNodeData(node.id, { [parentKey]: (newData as any)[parentKey] })
  }

  const renderAgentConfig = (data: AgentNodeData) => (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="basic">Basic</TabsTrigger>
        <TabsTrigger value="model">Model</TabsTrigger>
        <TabsTrigger value="prompt">Prompt</TabsTrigger>
      </TabsList>
      
      <TabsContent value="basic" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="agentName">Agent Name</Label>
          <Input
            id="agentName"
            value={data.config.name || ""}
            onChange={(e) => handleNestedChange("config", "name", e.target.value)}
            placeholder="AI Assistant"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="agentDescription">Agent Description</Label>
          <Textarea
            id="agentDescription"
            value={data.config.description || ""}
            onChange={(e) => handleNestedChange("config", "description", e.target.value)}
            placeholder="Describe the agent's role and capabilities"
          />
        </div>

        <div className="space-y-2">
          <Label>Status: <Badge variant={data.status === 'idle' ? 'secondary' : data.status === 'running' ? 'default' : data.status === 'success' ? 'default' : 'destructive'}>{data.status}</Badge></Label>
        </div>
      </TabsContent>
      
      <TabsContent value="model" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="model">LLM Model</Label>
          <Select
            value={data.config.model || "gpt-4o"}
            onValueChange={(value) => handleNestedChange("config", "model", value)}
          >
            <SelectTrigger id="model">
              <SelectValue placeholder="Select LLM model" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_MODELS.map((model) => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="temperature">Temperature: {data.config.temperature}</Label>
          <Slider
            id="temperature"
            min={0}
            max={1}
            step={0.1}
            value={[data.config.temperature]}
            onValueChange={(values) => handleNestedChange("config", "temperature", values[0])}
            className="w-full"
          />
          <div className="text-xs text-gray-500">Controls randomness in responses (0 = deterministic, 1 = creative)</div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="maxTokens">Max Tokens</Label>
          <Input
            id="maxTokens"
            type="number"
            value={data.config.maxTokens || 2000}
            onChange={(e) => handleNestedChange("config", "maxTokens", parseInt(e.target.value) || 2000)}
            min={1}
            max={8000}
          />
        </div>
      </TabsContent>
      
      <TabsContent value="prompt" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="systemPrompt">System Prompt</Label>
          <Textarea
            id="systemPrompt"
            value={data.config.systemPrompt || ""}
            onChange={(e) => handleNestedChange("config", "systemPrompt", e.target.value)}
            placeholder="You are a helpful AI assistant..."
            className="h-48"
          />
          <div className="text-xs text-gray-500">Instructions that define the agent's behavior and role</div>
        </div>
      </TabsContent>
    </Tabs>
  )

  const renderToolConfig = (data: ToolNodeData) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="toolSource">Tool Source</Label>
        <Select
          value={data.source || "mcp_tools"}
          onValueChange={(value) => handleChange("source", value)}
        >
          <SelectTrigger id="toolSource">
            <SelectValue placeholder="Select tool source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mcp_tools">MCP Tools</SelectItem>
            <SelectItem value="agent_skills">Agent Skills</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="toolId">Tool Selection</Label>
        <Select
          value={data.toolId || ""}
          onValueChange={(value) => handleChange("toolId", value)}
        >
          <SelectTrigger id="toolId">
            <SelectValue placeholder="Select a tool" />
          </SelectTrigger>
          <SelectContent>
            {MOCK_TOOLS.filter(tool => tool.source === data.source).map((tool) => (
              <SelectItem key={tool.id} value={tool.id}>
                {tool.name} - {tool.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="parameters">Parameters (JSON)</Label>
        <Textarea
          id="parameters"
          value={JSON.stringify(data.parameters || {}, null, 2)}
          onChange={(e) => {
            try {
              const params = JSON.parse(e.target.value)
              handleChange("parameters", params)
            } catch (err) {
            }
          }}
          placeholder='{"key": "value"}'
          className="h-32 font-mono"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="inputMapping">Input Mapping (JSON)</Label>
        <Textarea
          id="inputMapping"
          value={JSON.stringify(data.inputMapping || {}, null, 2)}
          onChange={(e) => {
            try {
              const mapping = JSON.parse(e.target.value)
              handleChange("inputMapping", mapping)
            } catch (err) {
            }
          }}
          placeholder='{"inputField": "sourceField"}'
          className="h-24 font-mono"
        />
      </div>
    </div>
  )

  const renderHandoffConfig = (data: HandoffNodeData) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="condition">Handoff Condition</Label>
        <Select
          value={data.condition || "completion"}
          onValueChange={(value) => handleChange("condition", value)}
        >
          <SelectTrigger id="condition">
            <SelectValue placeholder="Select condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="completion">Task Completion</SelectItem>
            <SelectItem value="condition">Custom Condition</SelectItem>
            <SelectItem value="error">Error Occurred</SelectItem>
            <SelectItem value="timeout">Timeout</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="targetAgent">Target Agent</Label>
        <Input
          id="targetAgent"
          value={data.routing.targetAgent || ""}
          onChange={(e) => handleNestedChange("routing", "targetAgent", e.target.value)}
          placeholder="agent-node-1"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="fallbackAgent">Fallback Agent (Optional)</Label>
        <Input
          id="fallbackAgent"
          value={data.routing.fallbackAgent || ""}
          onChange={(e) => handleNestedChange("routing", "fallbackAgent", e.target.value)}
          placeholder="fallback-agent"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="context">Context Data (JSON)</Label>
        <Textarea
          id="context"
          value={JSON.stringify(data.routing.context || {}, null, 2)}
          onChange={(e) => {
            try {
              const context = JSON.parse(e.target.value)
              handleNestedChange("routing", "context", context)
            } catch (err) {
            }
          }}
          placeholder='{"key": "value"}'
          className="h-32 font-mono"
        />
        <div className="text-xs text-gray-500">Data to pass along with the handoff</div>
      </div>
    </div>
  )

  const renderTypeSpecificConfig = () => {
    const data = localData as AgentNodeData | ToolNodeData | HandoffNodeData
    
    switch (data.type) {
      case "agent":
        return renderAgentConfig(data as AgentNodeData)
      case "tool":
        return renderToolConfig(data as ToolNodeData)
      case "handoff":
        return renderHandoffConfig(data as HandoffNodeData)
      default:
        return <div>Unknown node type</div>
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Configure {localData.label}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        <div className="space-y-2">
          <Label htmlFor="label">Node Label</Label>
          <Input 
            id="label" 
            value={localData.label || ""} 
            onChange={(e) => handleChange("label", e.target.value)} 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={localData.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Describe what this node does"
          />
        </div>

        <div className="border-t border-gray-200 my-4"></div>

        {renderTypeSpecificConfig()}
      </div>
    </div>
  )
}
