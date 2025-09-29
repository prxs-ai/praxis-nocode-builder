"use client"
import type React from 'react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { MessageCircle, Send, X, Minimize2, Maximize2, Wifi, WifiOff, Sparkles, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getWebSocketClient } from '@/lib/websocket-client'
import type { ChatMessage, WebSocketConnectionStatus, DSLAnalysisProgress, DSLAnalysisResult, DSLCommandPayload } from '@/lib/types'
import DSLProgress from './dsl-progress'
import DSLResult from './dsl-result'
import ToolResultCard from './ToolResultCard'
import { useToast } from '@/components/ui/use-toast'

// --- helpers for params/secrets ---
function safeParseJSON<T = any>(text: string | null, fallback: T): T {
  if (!text) return fallback
  try {
    const v = JSON.parse(text)
    if (v && typeof v === "object") return v
    return fallback
  } catch {
    return fallback
  }
}

let messageCounter = 0
const generateMessageId = (prefix: string) => {
  messageCounter++
  return `${prefix}_${Date.now()}_${messageCounter}_${Math.random().toString(36).substr(2, 9)}`
}

interface WorkflowChatProps {
  className?: string
  onCreateWorkflow?: (result: DSLAnalysisResult) => void
}

export default function WorkflowChat({ className, onCreateWorkflow }: WorkflowChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<WebSocketConnectionStatus>({
    connected: false,
    connecting: false,
    error: null,
    lastPingTime: null,
    reconnectAttempts: 0
  })
  const [currentDSLProgress, setCurrentDSLProgress] = useState<DSLAnalysisProgress | null>(null)
  const [isDSLProcessing, setIsDSLProcessing] = useState(false)
  const [currentWorkflow, setCurrentWorkflow] = useState<any>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [chatSize, setChatSize] = useState({ width: 480, height: 600 })

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [paramsJSON, setParamsJSON] = useState<string>('{}')
  const [secretsJSON, setSecretsJSON] = useState<string>('{}')
  const [paramsError, setParamsError] = useState<string | null>(null)
  const [secretsError, setSecretsError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsClient = getWebSocketClient()
  const { toast } = useToast()

  // Load saved params/secrets from localStorage on mount
  useEffect(() => {
    const savedParams = localStorage.getItem("praxis.params")
    const savedSecrets = localStorage.getItem("praxis.secrets")
    if (savedParams) setParamsJSON(savedParams)
    if (savedSecrets) setSecretsJSON(savedSecrets)
  }, [])

  const addAssistantMessage = useCallback((content: string, type: 'text' | 'system' | 'success' = 'text') => {
    const message: ChatMessage = {
      id: generateMessageId('assistant'),
      content,
      sender: 'assistant',
      timestamp: Date.now(),
      type
    }
    setMessages(prev => [...prev, message])
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    const unsubscribeStatus = wsClient.on('status', (status: WebSocketConnectionStatus) => {
      setConnectionStatus(status)
      setIsConnecting(status.connecting)
    })
    const unsubscribeChatMessage = wsClient.on('chatMessage', (message: ChatMessage) => {
      if (message.type === 'tool_result') {
        const toolResultMessage: ChatMessage = {
          id: generateMessageId('tool_result'),
          content: message.content,
          sender: 'assistant',
          timestamp: Date.now(),
          type: 'tool_result',
          metadata: {
            toolResult: message.metadata?.toolResult || (message as any).metadata?.toolResult || (message as any).metadata
          }
        }
        setMessages(prev => [...prev, toolResultMessage])
      } else {
        setMessages(prev => [...prev, message])
      }
    })
    const unsubscribeError = wsClient.on('error', (error: any) => {
      const errorMessage = error?.message || error || 'Unknown error occurred'
      setTimeout(() => {
        toast({
          title: "Connection Error",
          description: errorMessage,
          variant: "destructive",
        })
      }, 0)
      const chatErrorMessage: ChatMessage = {
        id: generateMessageId('error'),
        content: `Error: ${errorMessage}`,
        sender: 'assistant',
        timestamp: Date.now(),
        type: 'error'
      }
      setMessages(prev => [...prev, chatErrorMessage])
      setIsDSLProcessing(false)
      setCurrentDSLProgress(null)
    })
    const unsubscribeDSLProgress = wsClient.on('dslProgress', (progress: DSLAnalysisProgress) => {
      setCurrentDSLProgress(progress)
      setIsDSLProcessing(true)
      setMessages(prevMessages => {
        const existingProgressIndex = prevMessages.findIndex(msg => msg.type === 'dsl_progress')
        if (existingProgressIndex !== -1) {
          const updatedMessages = [...prevMessages]
          updatedMessages[existingProgressIndex] = {
            ...updatedMessages[existingProgressIndex],
            metadata: {
              ...updatedMessages[existingProgressIndex].metadata,
              progress
            }
          }
          return updatedMessages
        }
        return prevMessages
      })
    })
    const unsubscribeDSLResult = wsClient.on('dslResult', (result: DSLAnalysisResult) => {
      setIsDSLProcessing(false)
      setCurrentDSLProgress(null)
      const messageId = `dsl_result_${result.command}_${Date.now()}`
      setMessages(prevMessages => {
        const isDuplicate = prevMessages.some(msg => 
          msg.type === 'dsl_result' && 
          msg.metadata?.analysisResult?.command === result.command &&
          Math.abs(msg.timestamp - Date.now()) < 5000
        )
        if (isDuplicate) return prevMessages
        
        const agentCount = result.matchedAgents ? result.matchedAgents.length : 0
        if (result.success) {
          if (result.workflow) {
            setCurrentWorkflow(result.workflow)
            setTimeout(() => {
              toast({
                title: "Workflow Ready",
                description: `Found ${agentCount} matching agents. Click 'Execute' to run.`,
              })
            }, 0)
          }
        } else {
          setTimeout(() => {
            toast({
              title: "DSL Analysis Failed",
              description: result.error || "Unknown error occurred",
              variant: "destructive",
            })
          }, 0)
        }
        const resultMessage: ChatMessage = {
          id: messageId,
          content: result.success 
            ? `DSL analysis completed successfully! Found ${agentCount} matching agents.`
            : `DSL analysis failed: ${result.error}`,
          sender: 'assistant',
          timestamp: Date.now(),
          type: 'dsl_result',
          metadata: {
            analysisResult: result
          }
        }
        return [...prevMessages, resultMessage]
      })
    })
    const unsubscribeAssistantMessage = wsClient.on('addAssistantMessage', (data: { content: string, type?: string }) => {
      addAssistantMessage(data.content, data.type as any || 'text')
    })

    const unsubscribeWorkflowStep = wsClient.on('workflowStep', (update: any) => {
      if (update.message) {
        addAssistantMessage(`🔧 ${update.message}`, 'system')
      }
    })
    const unsubscribeWorkflowStepComplete = wsClient.on('workflowStepComplete', (update: any) => {
      if (update.result && update.result.message) {
        addAssistantMessage(`✅ ${update.result.message}`, 'success')
      }
    })
    const unsubscribeWorkflowComplete = wsClient.on('workflowComplete', (result: any) => {
      setIsExecuting(false)
      if (result.toolResults && Array.isArray(result.toolResults) && result.toolResults.length > 0) {
        const toolResult = result.toolResults[0]
        if (toolResult?.tool === 'telegram_poster' && toolResult?.result) {
          try {
            const telegramResult = typeof toolResult.result === 'string' 
              ? JSON.parse(toolResult.result) 
              : toolResult.result
            
            if (telegramResult.status === 'success' && telegramResult.data) {
              const { channel_title, message_preview, telegram_link } = telegramResult.data
              addAssistantMessage(
                `✅ Сообщение успешно отправлено в Telegram!\n\n` +
                `📢 Канал: ${channel_title}\n` +
                `💬 Сообщение: "${message_preview}"\n` +
                `🔗 Ссылка: ${telegram_link || 'Недоступна'}`,
                'success'
              )
            } else if (telegramResult.message) {
              addAssistantMessage(`✅ ${telegramResult.message}`, 'success')
            }
          } catch (e) {
            const messageText = result.message || 'Telegram message sent successfully!'
            addAssistantMessage(`✅ ${messageText}`, 'success')
          }
        } else {
          const messageText = result.message || 'Workflow completed successfully!'
          addAssistantMessage(`✅ ${messageText}`, 'success')
        }
      } else {
        const messageText = typeof result.message === 'string' 
          ? result.message 
          : typeof result.results === 'string'
            ? result.results
            : 'Workflow completed successfully!'
        addAssistantMessage(`✅ ${messageText}`, 'success')
      }
      if (result.nodeResults) {
        Object.entries(result.nodeResults).forEach(([nodeId, nodeResult]: [string, any]) => {
          if ((nodeResult as any).result && (nodeResult as any).result.message) {
            addAssistantMessage(`📋 Node ${nodeId}: ${(nodeResult as any).result.message}`, 'text')
          }
        })
      }
    })
    const unsubscribeWorkflowError = wsClient.on('workflowError', (error: any) => {
      setIsExecuting(false)
      const errorMessage = error.message || error.error || 'Workflow execution failed'
      addAssistantMessage(`❌ ${errorMessage}`, 'error')
    })
    const unsubscribeMCPToolResult = wsClient.on('mcpToolResult', (result: any) => {
      const fileName = result.filename || result.path || 'файл'
      const isSuccess = result.status === 'completed' || result.success
      if (isSuccess) {
        addAssistantMessage(`📁 File "${fileName}" successfully created via MCP server`, 'success')
      } else {
        const errorMsg = result.error || 'Неизвестная ошибка'
        addAssistantMessage(`❌ Error working with file "${fileName}": ${errorMsg}`, 'error')
      }
    })
    
    setConnectionStatus(wsClient.getStatus())
    return () => {
      unsubscribeStatus()
      unsubscribeChatMessage()
      unsubscribeError()
      unsubscribeDSLProgress()
      unsubscribeDSLResult()
      unsubscribeAssistantMessage()
      unsubscribeWorkflowStep()
      unsubscribeWorkflowStepComplete()
      unsubscribeWorkflowComplete()
      unsubscribeWorkflowError()
      unsubscribeMCPToolResult()
    }
  }, [wsClient, addAssistantMessage, toast])

  const handleConnect = async () => {
    if (connectionStatus.connected) return
    setIsConnecting(true)
    try {
      await wsClient.connect()
      toast({
        title: "Connected",
        description: "Successfully connected to Praxis workflow assistant",
      })
      const welcomeMessage: ChatMessage = {
        id: generateMessageId('welcome'),
        content: 'Connected to Praxis workflow assistant. How can I help you with your workflow?',
        sender: 'assistant',
        timestamp: Date.now(),
        type: 'system'
      }
      setMessages(prev => [...prev, welcomeMessage])
    } catch (error) {
      console.error('Failed to connect:', error)
      toast({
        title: "Connection Failed",
        description: "Failed to connect to the workflow assistant. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    wsClient.disconnect()
    const disconnectMessage: ChatMessage = {
      id: generateMessageId('disconnect'),
      content: 'Disconnected from workflow assistant.',
      sender: 'assistant',
      timestamp: Date.now(),
      type: 'system'
    }
    setMessages(prev => [...prev, disconnectMessage])
  }

  const isDSLCommand = (text: string): boolean => {
    const dslKeywords = [
      'agent', 'workflow', 'tool', 'handoff', 'create', 'build', 'flow', 
      'process', 'analyze', 'execute', 'task', 'delegate', 'capability',
      'create workflow', 'build workflow', 'make workflow',
      'find agents', 'use tools', 'with capabilities'
    ]
    const lowerText = text.toLowerCase()
    return dslKeywords.some(keyword => lowerText.includes(keyword))
  }

  // Apply / Save params + secrets from UI  ✅ This is the important fix
  const saveParamsAndSecrets = () => {
    setParamsError(null)
    setSecretsError(null)

    try {
      const parsedParams = paramsJSON.trim() ? JSON.parse(paramsJSON) : {}
      if (parsedParams && typeof parsedParams !== "object") throw new Error("Params must be a JSON object")
      const prettyParams = JSON.stringify(parsedParams, null, 2)
      localStorage.setItem("praxis.params", prettyParams)
      setParamsJSON(prettyParams) // pretty-print back into the textarea
    } catch (e: any) {
      setParamsError(e?.message || "Invalid JSON")
      return
    }

    try {
      const parsedSecrets = secretsJSON.trim() ? JSON.parse(secretsJSON) : {}
      if (parsedSecrets && typeof parsedSecrets !== "object") throw new Error("Secrets must be a JSON object")
      const prettySecrets = JSON.stringify(parsedSecrets, null, 2)
      localStorage.setItem("praxis.secrets", prettySecrets)
      setSecretsJSON(prettySecrets) // pretty-print back into the textarea
    } catch (e: any) {
      setSecretsError(e?.message || "Invalid JSON")
      return
    }

    toast({ title: "Saved", description: "Params & secrets saved for this session." })
  }

  const handleSendMessage = () => {
    if (!inputValue.trim() || !connectionStatus.connected) return
    const messageContent = inputValue.trim()
    const isDSL = isDSLCommand(messageContent)

    // pull current params/secrets (even if UI not opened)
    const params = safeParseJSON<Record<string, any>>(localStorage.getItem("praxis.params"), {})
    const secrets = safeParseJSON<Record<string, string>>(localStorage.getItem("praxis.secrets"), {})

    const userMessage: ChatMessage = {
      id: generateMessageId('user'),
      content: messageContent,
      sender: 'user',
      timestamp: Date.now(),
      type: 'text',
      metadata: {
        isDslCommand: isDSL
      }
    }
    setMessages(prev => [...prev, userMessage])

    let sent = false
    if (isDSL) {
      const workflowId = `workflow_${Date.now()}`
      const dslPayload: DSLCommandPayload & { params?: Record<string, any>, secrets?: Record<string, string> } = {
        command: messageContent,
        workflowId,
        context: {
          timestamp: Date.now(),
          source: 'chat'
        },
        params,
        secrets
      }
      sent = wsClient.sendDSLCommand(dslPayload)
      if (sent) {
        setIsDSLProcessing(true)
        const progressMessage: ChatMessage = {
          id: generateMessageId('dsl_progress'),
          content: 'Processing DSL command...',
          sender: 'assistant',
          timestamp: Date.now(),
          type: 'dsl_progress',
          metadata: {
            workflowId,
            isDslCommand: true
          }
        }
        setMessages(prev => [...prev, progressMessage])
      }
    } else {
      sent = wsClient.sendChatMessage(messageContent)
    }

    if (!sent) {
      toast({
        title: "Message Send Failed",
        description: "Failed to send message. Please check your connection.",
        variant: "destructive",
      })
      const errorMessage: ChatMessage = {
        id: generateMessageId('error'),
        content: 'Failed to send message. Please check your connection.',
        sender: 'assistant',
        timestamp: Date.now(),
        type: 'error'
      }
      setMessages(prev => [...prev, errorMessage])
    }
    setInputValue('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getConnectionBadge = () => {
    if (connectionStatus.connecting || isConnecting) {
      return <Badge variant="secondary" className="text-xs"><WifiOff className="w-3 h-3 mr-1" />Connecting...</Badge>
    }
    if (connectionStatus.connected) {
      return <Badge variant="default" className="text-xs bg-green-500"><Wifi className="w-3 h-3 mr-1" />Connected</Badge>
    }
    if (connectionStatus.error) {
      return <Badge variant="destructive" className="text-xs"><WifiOff className="w-3 h-3 mr-1" />Error</Badge>
    }
    return <Badge variant="outline" className="text-xs"><WifiOff className="w-3 h-3 mr-1" />Disconnected</Badge>
  }

  const ChatToggle = () => (
    <Button
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg",
        "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
        "transition-all duration-200 ease-in-out",
        isOpen && "rotate-180"
      )}
      size="icon"
    >
      {isOpen ? (
        <X className="h-6 w-6 text-white" />
      ) : (
        <MessageCircle className="h-6 w-6 text-white" />
      )}
    </Button>
  )

  if (!isOpen) {
    return <ChatToggle />
  }

  return (
    <>
      <ChatToggle />
      <div 
        className={cn(
          "fixed bottom-24 right-6 z-40 transition-all duration-300 ease-in-out resize-both overflow-hidden border-2 border-blue-200 rounded-lg shadow-2xl",
          "hover:border-blue-300 hover:shadow-3xl",
          isMinimized && "h-16 w-80",
          className
        )}
        style={{
          width: isMinimized ? 320 : chatSize.width,
          height: isMinimized ? 64 : chatSize.height,
          minWidth: 320,
          minHeight: isMinimized ? 64 : 400,
          maxWidth: 800,
          maxHeight: 900,
          resize: 'both'
        }}
      >
        <Card className="h-full shadow-xl border-2 bg-white/95 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Workflow Assistant
              </CardTitle>
              <div className="flex items-center gap-1">
                {getConnectionBadge()}
                <Button
                  onClick={() => setIsMinimized(!isMinimized)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                >
                  {isMinimized ? (
                    <Maximize2 className="h-3 w-3" />
                  ) : (
                    <Minimize2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          {!isMinimized && (
            <CardContent className="p-0 h-[calc(100%-3.5rem)] flex flex-col">
              {/* Connection block */}
              {!connectionStatus.connected && (
                <div className="p-3 border-b">
                  <Button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    size="sm"
                    className="w-full text-xs"
                    variant="outline"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect to Assistant'}
                  </Button>
                  {connectionStatus.error && (
                    <p className="text-xs text-red-600 mt-1">{connectionStatus.error}</p>
                  )}
                </div>
              )}
              {connectionStatus.connected && (
                <div className="p-3 border-b flex items-center justify-between gap-2">
                  <Button
                    onClick={handleDisconnect}
                    size="sm"
                    className="text-xs"
                    variant="outline"
                  >
                    Disconnect
                  </Button>
                  <Button
                    onClick={() => setShowAdvanced(s => !s)}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    title="Params & Secrets"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Params & Secrets
                  </Button>
                </div>
              )}

              {/* Advanced params/secrets editor */}
              {connectionStatus.connected && showAdvanced && (
                <div className="p-3 border-b bg-gray-50">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-medium mb-1">Params (JSON)</div>
                      <Textarea
                        className="h-24 text-xs"
                        value={paramsJSON}
                        onChange={(e) => setParamsJSON(e.target.value)}
                        placeholder='{"username":"alice","limit":5}'
                      />
                      {paramsError && <div className="text-xs text-red-600 mt-1">{paramsError}</div>}
                    </div>
                    <div>
                      <div className="text-xs font-medium mb-1">Secrets (JSON)</div>
                      <Textarea
                        className="h-24 text-xs"
                        value={secretsJSON}
                        onChange={(e) => setSecretsJSON(e.target.value)}
                        placeholder='{"OPENAI_API_KEY":"sk-..."}'
                      />
                      {secretsError && <div className="text-xs text-red-600 mt-1">{secretsError}</div>}
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" onClick={saveParamsAndSecrets} className="text-xs">
                      Save
                    </Button>
                  </div>
                </div>
              )}

              {/* Messages + composer */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                  {messages.length === 0 ? (
                    <div className="text-xs text-gray-500 text-center py-4">
                      {connectionStatus.connected 
                        ? "Start a conversation with your workflow assistant..."
                        : "Connect to start chatting with your workflow assistant"
                      }
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <div key={message.id} className="w-full">
                          {message.type === 'tool_result' && message.metadata?.toolResult ? (
                            <ToolResultCard metadata={message.metadata.toolResult} />
                          ) : message.type === 'dsl_result' && message.metadata?.analysisResult ? (
                            <DSLResult 
                              result={message.metadata.analysisResult}
                              onCreateWorkflow={() => {
                                if (onCreateWorkflow && message.metadata?.analysisResult) {
                                  onCreateWorkflow(message.metadata.analysisResult)
                                  const workflowMessage: ChatMessage = {
                                    id: generateMessageId('workflow_creating'),
                                    content: `🎯 Creating visual workflow from DSL analysis...`,
                                    sender: 'assistant',
                                    timestamp: Date.now(),
                                    type: 'system'
                                  }
                                  setMessages(prev => [...prev, workflowMessage])
                                }
                              }}
                              onExecute={() => {
                                if (message.metadata?.analysisResult?.workflow) {
                                  setIsExecuting(true)
                                  const executeMessage: ChatMessage = {
                                    id: generateMessageId('workflow_executing'),
                                    content: `▶️ Executing workflow...`,
                                    sender: 'assistant',
                                    timestamp: Date.now(),
                                    type: 'system'
                                  }
                                  setMessages(prev => [...prev, executeMessage])

                                  // include params & secrets from localStorage
                                  const params = safeParseJSON<Record<string, any>>(localStorage.getItem("praxis.params"), {})
                                  const secrets = safeParseJSON<Record<string, string>>(localStorage.getItem("praxis.secrets"), {})

                                  wsClient.sendMessage('EXECUTE_WORKFLOW', {
                                    workflow: message.metadata.analysisResult.workflow,
                                    workflowId: message.metadata.analysisResult.workflow.id,
                                    params,
                                    secrets
                                  })
                                }
                              }}
                              isExecuting={isExecuting}
                            />
                          ) : (
                            <div
                              className={cn(
                                "flex flex-col text-xs rounded-lg p-2 max-w-[90%]",
                                message.sender === 'user'
                                  ? cn(
                                      "ml-auto text-white",
                                      message.metadata?.isDslCommand 
                                        ? "bg-gradient-to-r from-purple-500 to-blue-500" 
                                        : "bg-blue-500"
                                    )
                                  : message.type === 'error'
                                  ? "mr-auto bg-red-100 text-red-800 border border-red-200"
                                  : message.type === 'system'
                                  ? "mr-auto bg-yellow-100 text-yellow-800 border border-yellow-200"
                                  : message.type === 'success'
                                  ? "mr-auto bg-green-100 text-green-800 border border-green-200"
                                  : message.type === 'dsl_progress'
                                  ? "mr-auto bg-purple-50 text-purple-800 border border-purple-200"
                                  : "mr-auto bg-white border border-gray-200"
                              )}
                            >
                              <div className="flex items-center gap-1">
                                {message.metadata?.isDslCommand && (
                                  <Sparkles className="h-3 w-3" />
                                )}
                                <div className="leading-relaxed">{message.content}</div>
                              </div>
                              <div 
                                className={cn(
                                  "text-xs mt-1 opacity-70",
                                  message.sender === 'user' ? "text-blue-100" : "text-gray-500"
                                )}
                              >
                                {formatTime(message.timestamp)}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {isDSLProcessing && currentDSLProgress && (
                        <div className="w-full">
                          <DSLProgress progress={currentDSLProgress} />
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t bg-white p-3">
                  <div className="flex gap-2">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={connectionStatus.connected ? "Type a message or DSL command..." : "Connect to chat"}
                      disabled={!connectionStatus.connected || isDSLProcessing}
                      className="text-xs flex-1"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || !connectionStatus.connected || isDSLProcessing}
                      size="sm"
                      className="px-3"
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </>
  )
}