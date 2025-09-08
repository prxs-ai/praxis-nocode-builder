"use client"
import type React from 'react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Send, X, Minimize2, Maximize2, Wifi, WifiOff, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getWebSocketClient } from '@/lib/websocket-client'
import type { ChatMessage, WebSocketConnectionStatus, DSLAnalysisProgress, DSLAnalysisResult, DSLCommandPayload } from '@/lib/types'
import DSLProgress from './dsl-progress'
import DSLResult from './dsl-result'
import ToolResultCard from './ToolResultCard'
import { useToast } from '@/components/ui/use-toast'
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
  const [chatSize, setChatSize] = useState({ width: 480, height: 600 }) // Larger default size: w-120 h-150
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsClient = getWebSocketClient()
  const { toast } = useToast()
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
      // Support structured tool_result messages
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
      // Use setTimeout to avoid setState during render
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
      
      // Update existing progress message instead of creating new ones
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
      
      // Prevent duplicate messages 
      const messageId = `dsl_result_${result.command}_${Date.now()}`
      
      // Check if we already have this message
      setMessages(prevMessages => {
        const isDuplicate = prevMessages.some(msg => 
          msg.type === 'dsl_result' && 
          msg.metadata?.analysisResult?.command === result.command &&
          Math.abs(msg.timestamp - Date.now()) < 5000 // Within 5 seconds
        )
        
        if (isDuplicate) {
          return prevMessages // Skip duplicate
        }
        
        const agentCount = result.matchedAgents ? result.matchedAgents.length : 0
        if (result.success) {
          // Store workflow and show Execute button
          if (result.workflow) {
            setCurrentWorkflow(result.workflow)
            // Don't execute immediately - wait for user to click Execute
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

    // Добавляем обработчики для новых событий воркфлоу
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
      // Reset executing state
      setIsExecuting(false)
      
      // Parse tool results if available
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
            // Fallback to simple message
            const messageText = result.message || 'Telegram message sent successfully!'
            addAssistantMessage(`✅ ${messageText}`, 'success')
          }
        } else {
          // Generic tool result
          const messageText = result.message || 'Workflow completed successfully!'
          addAssistantMessage(`✅ ${messageText}`, 'success')
        }
      } else {
        // Fallback for workflows without tool results
        const messageText = typeof result.message === 'string' 
          ? result.message 
          : typeof result.results === 'string'
            ? result.results
            : 'Workflow completed successfully!'
        addAssistantMessage(`✅ ${messageText}`, 'success')
      }
      
      // Показываем детализированные результаты если есть
      if (result.nodeResults) {
        Object.entries(result.nodeResults).forEach(([nodeId, nodeResult]: [string, any]) => {
          if (nodeResult.result && nodeResult.result.message) {
            addAssistantMessage(`📋 Node ${nodeId}: ${nodeResult.result.message}`, 'text')
          }
        })
      }
    })

    const unsubscribeWorkflowError = wsClient.on('workflowError', (error: any) => {
      // Reset executing state
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
  }, [wsClient])
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
  const handleSendMessage = () => {
    if (!inputValue.trim() || !connectionStatus.connected) return
    const messageContent = inputValue.trim()
    const isDSL = isDSLCommand(messageContent)
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
      const dslPayload: DSLCommandPayload = {
        command: messageContent,
        workflowId,
        context: {
          timestamp: Date.now(),
          source: 'chat'
        }
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
              {}
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
                <div className="p-3 border-b">
                  <Button
                    onClick={handleDisconnect}
                    size="sm"
                    className="w-full text-xs"
                    variant="outline"
                  >
                    Disconnect
                  </Button>
                </div>
              )}
              {}
              <div className="flex-1 flex flex-col overflow-hidden">
                {}
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
                                  // Send the workflow for execution
                                  const executeMessage: ChatMessage = {
                                    id: generateMessageId('workflow_executing'),
                                    content: `▶️ Executing workflow...`,
                                    sender: 'assistant',
                                    timestamp: Date.now(),
                                    type: 'system'
                                  }
                                  setMessages(prev => [...prev, executeMessage])
                                  
                                  // Send execution command to backend with correct format
                                  wsClient.sendMessage('EXECUTE_WORKFLOW', {
                                    workflow: message.metadata.analysisResult.workflow,
                                    workflowId: message.metadata.analysisResult.workflow.id
                                  })
                                  
                                  // State will be reset by workflowComplete or workflowError events
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
                      {}
                      {isDSLProcessing && currentDSLProgress && (
                        <div className="w-full">
                          <DSLProgress progress={currentDSLProgress} />
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                {}
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
