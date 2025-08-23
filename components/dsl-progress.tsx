"use client"
import type React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Circle, Loader2, AlertCircle, Users, Cog, Workflow } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DSLAnalysisProgress } from '@/lib/types'
interface DSLProgressProps {
  progress: DSLAnalysisProgress
  className?: string
}
const stageIcons = {
  analyzing: Loader2,
  discovering: Users,
  matching: Cog,
  generating: Workflow,
  complete: CheckCircle
}
const stageLabels = {
  analyzing: 'Analyzing Command',
  discovering: 'Discovering Agents',
  matching: 'Matching Capabilities',
  generating: 'Generating Workflow',
  complete: 'Complete'
}
const stageProgress = {
  analyzing: 20,
  discovering: 40,
  matching: 60,
  generating: 80,
  complete: 100
}
export default function DSLProgress({ progress, className }: DSLProgressProps) {
  const stages = ['analyzing', 'discovering', 'matching', 'generating', 'complete'] as const
  const currentStageIndex = stages.indexOf(progress.stage)
  const progressValue = stageProgress[progress.stage]
  const Icon = stageIcons[progress.stage] || Loader2
  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="pt-4">
        {}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={cn(
                "h-4 w-4",
                progress.stage === 'complete' ? "text-green-600" : "text-blue-600 animate-spin"
              )} />
              <span className="text-sm font-medium">
                {stageLabels[progress.stage]}
              </span>
            </div>
            <Badge variant={progress.stage === 'complete' ? 'default' : 'secondary'}>
              {progressValue}%
            </Badge>
          </div>
          <Progress value={progressValue} className="h-2" />
          <p className="text-xs text-gray-600">{progress.message}</p>
        </div>
        {}
        <div className="mt-4 flex items-center justify-between">
          {stages.map((stage, index) => {
            const StageIcon = stageIcons[stage]
            const isCompleted = index < currentStageIndex
            const isCurrent = index === currentStageIndex
            const isPending = index > currentStageIndex
            return (
              <div
                key={stage}
                className={cn(
                  "flex flex-col items-center gap-1",
                  "transition-colors duration-200"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2",
                  isCompleted && "bg-green-100 border-green-500 text-green-600",
                  isCurrent && "bg-blue-100 border-blue-500 text-blue-600",
                  isPending && "bg-gray-100 border-gray-300 text-gray-400"
                )}>
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : isCurrent ? (
                    <StageIcon className={cn(
                      "h-4 w-4",
                      progress.stage !== 'complete' && "animate-spin"
                    )} />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </div>
                <span className={cn(
                  "text-xs text-center font-medium max-w-16",
                  isCompleted && "text-green-600",
                  isCurrent && "text-blue-600",
                  isPending && "text-gray-400"
                )}>
                  {stageLabels[stage]}
                </span>
              </div>
            )
          })}
        </div>
        {}
        {progress.details && (
          <div className="mt-4 space-y-2">
            {progress.details.requiredSkills && progress.details.requiredSkills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs font-medium text-gray-500">Skills:</span>
                {progress.details.requiredSkills.map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
            {progress.details.requiredTools && progress.details.requiredTools.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs font-medium text-gray-500">Tools:</span>
                {progress.details.requiredTools.map((tool, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tool}
                  </Badge>
                ))}
              </div>
            )}
            {progress.details.discoveredAgents && progress.details.discoveredAgents.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs font-medium text-gray-500">Found Agents:</span>
                {progress.details.discoveredAgents.map((agent, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {agent}
                  </Badge>
                ))}
              </div>
            )}
            {progress.details.agentMatches !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Agent Matches:</span>
                <Badge variant="default" className="text-xs">
                  {progress.details.agentMatches}
                </Badge>
              </div>
            )}
            {progress.details.generatedNodes !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Generated Nodes:</span>
                <Badge variant="default" className="text-xs">
                  {progress.details.generatedNodes}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}