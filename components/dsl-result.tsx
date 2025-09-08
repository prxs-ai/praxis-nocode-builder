"use client"

import type React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle, Users, Wrench, Clock, PlayCircle } from 'lucide-react'
import type { DSLAnalysisResult } from '@/lib/types'

interface DSLResultProps {
  result: DSLAnalysisResult
  onCreateWorkflow?: () => void
  onExecute?: () => void
  isExecuting?: boolean
}

export default function DSLResult({ result, onCreateWorkflow, onExecute, isExecuting = false }: DSLResultProps) {
  if (!result) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">No analysis result available</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const agentCount = result.matchedAgents?.length || 0
  const toolCount = result.requiredMCPTools?.length || 0

  if (!result.success) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Analysis failed: {result.error || 'Unknown error'}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-green-800">
          <CheckCircle className="h-4 w-4" />
          DSL Analysis Complete
          <Badge variant="secondary" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {Math.round(result.processTime || 0)}ms
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        <div className="text-sm text-green-700">
          <strong>Command:</strong> "{result.command}"
        </div>

        {agentCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-green-800">
              <Users className="h-4 w-4" />
              Found {agentCount} matching agents
            </div>
            <div className="space-y-1">
              {result.matchedAgents?.map((agent, index) => (
                <div key={index} className="text-xs bg-white/60 p-2 rounded border">
                  <div className="font-medium text-blue-700">{agent.agentName || agent.name}</div>
                  {agent.reasoning && (
                    <div className="text-gray-600 mt-1">{agent.reasoning}</div>
                  )}
                  {agent.matchScore !== undefined && (
                    <div className="text-green-600 mt-1">
                      Match Score: {(agent.matchScore * 100).toFixed(0)}%
                    </div>
                  )}
                  {agent.capabilities?.length > 0 && (
                    <div className="mt-1">
                      <span className="text-gray-500 text-xs">Capabilities: </span>
                      {agent.capabilities.map((cap, i) => (
                        <Badge key={i} variant="outline" className="text-xs mr-1">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )) || null}
            </div>
          </div>
        )}

        {toolCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-green-800">
              <Wrench className="h-4 w-4" />
              Required {toolCount} MCP tools
            </div>
            <div className="space-y-1">
              {result.requiredMCPTools?.map((tool, index) => (
                <div key={index} className="text-xs bg-white/60 p-2 rounded border">
                  <div className="font-medium text-purple-700">{tool.name}</div>
                  {tool.description && (
                    <div className="text-gray-600 mt-1">{tool.description}</div>
                  )}
                  {tool.category && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {tool.category}
                    </Badge>
                  )}
                </div>
              )) || null}
            </div>
          </div>
        )}

        {result.reasoning && (
          <div className="text-xs text-gray-600 bg-white/40 p-2 rounded">
            <strong>Analysis:</strong> {result.reasoning}
          </div>
        )}

        <div className="flex gap-2">
          {onCreateWorkflow && (
            <Button 
              onClick={onCreateWorkflow}
              size="sm" 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isExecuting}
            >
              Create Visual Workflow
            </Button>
          )}
          {onExecute && (
            <Button 
              onClick={onExecute}
              size="sm" 
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              disabled={isExecuting}
            >
              <PlayCircle className="h-4 w-4 mr-1" />
              {isExecuting ? 'Executing...' : 'Execute'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}