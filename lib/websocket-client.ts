"use client"
import type { WebSocketMessage, WebSocketConnectionStatus, WorkflowStatusUpdate, ChatMessage, DSLCommandPayload, DSLAnalysisProgress, DSLAnalysisResult, AgentAssignment, ToolInvocation, WorkflowExecutionTimeline, PerformanceMetrics } from './types'
export class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private pingInterval: NodeJS.Timeout | null = null
  private pingTimeoutId: NodeJS.Timeout | null = null
  private listeners: Map<string, Set<Function>> = new Map()
  private status: WebSocketConnectionStatus = {
    connected: false,
    connecting: false,
    error: null,
    lastPingTime: null,
    reconnectAttempts: 0
  }
  constructor(url: string = 'ws://localhost:9100/ws/workflow') {
    this.url = url
    this.initializeEventMaps()
    setTimeout(() => {
      this.connect().catch(error => {
        console.warn('Auto-connect failed:', error.message)
      })
    }, 100)
  }
  private initializeEventMaps() {
    this.listeners.set('status', new Set())
    this.listeners.set('message', new Set())
    this.listeners.set('workflowUpdate', new Set())
    this.listeners.set('chatMessage', new Set())
    this.listeners.set('error', new Set())
    this.listeners.set('dslProgress', new Set())
    this.listeners.set('dslResult', new Set())
    this.listeners.set('workflowStart', new Set())
    this.listeners.set('workflowStep', new Set())
    this.listeners.set('workflowStepComplete', new Set())
    this.listeners.set('workflowProgress', new Set())
    this.listeners.set('taskDelegation', new Set())
    this.listeners.set('toolInvocation', new Set())
    this.listeners.set('workflowComplete', new Set())
    this.listeners.set('workflowError', new Set())
    this.listeners.set('agentAssignment', new Set())
    this.listeners.set('performanceUpdate', new Set())
    this.listeners.set('addAssistantMessage', new Set())
    this.listeners.set('nodeStatusUpdate', new Set())
  }
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }
      this.updateStatus({
        ...this.status,
        connecting: true,
        error: null
      })
      try {
        this.ws = new WebSocket(this.url)
        this.ws.onopen = () => {
          console.log('WebSocket connected to', this.url)
          this.reconnectAttempts = 0
          this.updateStatus({
            connected: true,
            connecting: false,
            error: null,
            lastPingTime: null,
            reconnectAttempts: 0
          })
          this.startPingInterval()
          resolve()
        }
        this.ws.onmessage = (event) => {
          this.handleMessage(event)
        }
        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason)
          this.cleanup()
          const wasUnexpected = event.code !== 1000
          const errorMessage = event.reason || (wasUnexpected ? 'Connection lost unexpectedly' : 'Connection closed')
          this.updateStatus({
            connected: false,
            connecting: false,
            error: errorMessage,
            lastPingTime: null,
            reconnectAttempts: this.reconnectAttempts
          })
          if (wasUnexpected) {
            this.emit('error', { 
              message: errorMessage, 
              code: event.code || 'UNEXPECTED_DISCONNECT',
              reason: event.reason || 'Unknown reason'
            })
          }
          if (wasUnexpected && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect()
          }
        }
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          const errorMessage = 'Connection failed'
          const errorData = {
            message: errorMessage,
            code: 'CONNECTION_FAILED',
            originalError: error
          }
          this.updateStatus({
            ...this.status,
            connecting: false,
            error: errorMessage
          })
          this.emit('error', errorData)
          reject(new Error('WebSocket connection failed'))
        }
      } catch (error) {
        console.error('Failed to create WebSocket:', error)
        this.updateStatus({
          ...this.status,
          connecting: false,
          error: 'Failed to create connection'
        })
        reject(error)
      }
    })
  }
  public disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.cleanup()
    }
  }
  public sendMessage(message: WebSocketMessage): boolean
  public sendMessage(type: string, payload: any): boolean
  public sendMessage(messageOrType: WebSocketMessage | string, payload?: any): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send message')
      return false
    }
    
    try {
      let message: WebSocketMessage
      
      if (typeof messageOrType === 'string') {
        message = {
          type: messageOrType,
          payload,
          timestamp: new Date().toISOString(),
          messageId: this.generateMessageId()
        }
      } else {
        message = messageOrType
      }
      
      const backendMessage = this.transformToBackendFormat(message)
      this.ws.send(JSON.stringify(backendMessage))
      return true
    } catch (error) {
      console.error('Failed to send WebSocket message:', error)
      const errorData = {
        message: error instanceof Error ? error.message : 'Failed to send message',
        code: 'SEND_FAILED',
        originalError: error
      }
      this.emit('error', errorData)
      return false
    }
  }
  public sendChatMessage(content: string): boolean {
    const message: WebSocketMessage = {
      type: 'CHAT_MESSAGE',
      payload: {
        content,
        sender: 'user',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      messageId: this.generateMessageId()
    }
    return this.sendMessage(message)
  }
  public sendDSLCommand(payload: DSLCommandPayload): boolean {
    const message: WebSocketMessage = {
      type: 'DSL_COMMAND',
      payload,
      timestamp: new Date().toISOString(),
      messageId: this.generateMessageId()
    }
    return this.sendMessage(message)
  }
  public startWorkflowExecution(workflowId: string, nodes: any[], edges?: any[]): boolean {
    const message: WebSocketMessage = {
      type: 'EXECUTE_WORKFLOW',
      payload: {
        workflowId,
        nodes,
        edges: edges || [],
        startTime: Date.now()
      },
      timestamp: new Date().toISOString(),
      messageId: this.generateMessageId()
    }
    return this.sendMessage(message)
  }
  public reportNodeExecution(nodeId: string, status: string, executionData?: any): boolean {
    const message: WebSocketMessage = {
      type: 'WORKFLOW_STEP',
      payload: {
        nodeId,
        status,
        timestamp: new Date().toISOString(),
        ...executionData
      },
      timestamp: new Date().toISOString(),
      messageId: this.generateMessageId()
    }
    return this.sendMessage(message)
  }
  public requestAgentAssignment(nodeId: string, requiredCapabilities: string[]): boolean {
    const message: WebSocketMessage = {
      type: 'TASK_DELEGATION',
      payload: {
        nodeId,
        requiredCapabilities,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      messageId: this.generateMessageId()
    }
    return this.sendMessage(message)
  }
  private handleMessage(event: MessageEvent): void {
    try {
      // Handle potential concatenated JSON messages
      const dataStr = event.data.toString()
      const lines = dataStr.split('\n').filter(line => line.trim())
      
      // Process each JSON message separately
      for (const line of lines) {
        const rawMessage = JSON.parse(line)
        const message: WebSocketMessage = this.transformMessage(rawMessage)
        this.emit('message', message)
        this.processMessage(message)
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
      console.error('Raw data:', event.data.toString().substring(0, 200) + '...')
      return
    }
  }

  private processMessage(message: WebSocketMessage): void {
    try {
      switch (message.type) {
        case 'PONG':
          this.handlePong()
          break
        case 'NODE_UPDATE':
          if (message.payload) {
            this.emit('workflowUpdate', message.payload as WorkflowStatusUpdate)
          }
          break
        case 'NODE_STATUS_UPDATE':
          if (message.payload) {
            this.emit('nodeStatusUpdate', {
              workflowId: message.payload.workflowId,
              nodeId: message.payload.nodeId,
              status: message.payload.status,
              timestamp: message.payload.timestamp
            })
          }
          break
        case 'CHAT_RESPONSE':
          if (message.payload) {
            const chatMessage: ChatMessage = {
              id: message.messageId || this.generateMessageId(),
              content: message.payload.content || '',
              sender: 'assistant',
              timestamp: message.timestamp,
              type: 'text'
            }
            this.emit('chatMessage', chatMessage)
          }
          break
        case 'DSL_PROGRESS':
        case 'DSL_ANALYSIS_START':
        case 'AGENT_DISCOVERY':
        case 'CAPABILITY_ANALYSIS':
        case 'WORKFLOW_GENERATION':
          if (message.payload) {
            this.emit('dslProgress', {
              stage: message.payload.stage || this.mapMessageTypeToStage(message.type),
              message: message.payload.message || this.getDefaultProgressMessage(message.type),
              details: message.payload
            } as DSLAnalysisProgress)
          }
          break
        case 'DSL_RESULT':
        case 'ANALYSIS_COMPLETE':
          if (message.payload) {
            this.emit('dslResult', message.payload as DSLAnalysisResult)
            // Add result to chat
            if (message.payload.success) {
              this.emit('addAssistantMessage', {
                content: `✅ DSL command processed successfully`,
                type: 'success',
                timestamp: new Date().toISOString()
              })
            }
          }
          break
        case 'WORKFLOW_LOG':
          if (message.payload) {
            // Emit workflow log for display
            const logMessage = `[${message.payload.level?.toUpperCase() || 'INFO'}] ${message.payload.source || 'System'}: ${message.payload.message}`
            this.emit('addAssistantMessage', {
              content: logMessage,
              type: message.payload.level === 'error' ? 'error' : 'system',
              timestamp: message.payload.timestamp || new Date().toISOString()
            })
          }
          break
        case 'WORKFLOW_START':
          if (message.payload) {
            this.emit('workflowStart', message.payload as WorkflowExecutionTimeline)
          }
          break
        case 'WORKFLOW_STEP':
          if (message.payload) {
            this.emit('workflowStep', message.payload as WorkflowStatusUpdate)
          }
          break
        case 'WORKFLOW_STEP_COMPLETE':
          if (message.payload) {
            this.emit('workflowStepComplete', message.payload as WorkflowStatusUpdate)
          }
          break
        case 'WORKFLOW_PROGRESS':
          if (message.payload) {
            this.emit('workflowProgress', message.payload as WorkflowExecutionTimeline)
          }
          break
        case 'TASK_DELEGATION':
          if (message.payload) {
            this.emit('taskDelegation', message.payload as AgentAssignment)
            this.emit('agentAssignment', message.payload as AgentAssignment)
          }
          break
        case 'TOOL_INVOCATION':
          if (message.payload) {
            this.emit('toolInvocation', message.payload as ToolInvocation)
          }
          break
        case 'WORKFLOW_COMPLETE':
          if (message.payload) {
            this.emit('workflowComplete', message.payload as PerformanceMetrics)
            this.emit('performanceUpdate', message.payload as PerformanceMetrics)
            // Добавляем сообщение в чат о завершении
            // Extract message properly and ensure it's a string
            const completionMessage = typeof message.payload.message === 'string' 
              ? message.payload.message 
              : message.payload.results 
                ? (typeof message.payload.results === 'string' ? message.payload.results : 'Workflow completed')
                : 'Workflow execution completed successfully'
            
            this.emit('addAssistantMessage', {
              content: `✅ ${completionMessage}`,
              type: 'success',
              timestamp: new Date().toISOString()
            })
          }
          break
        case 'WORKFLOW_ERROR':
          if (message.payload) {
            this.emit('workflowError', message.payload)
            // Добавляем сообщение об ошибке в чат
            this.emit('addAssistantMessage', {
              content: `❌ Ошибка выполнения воркфлоу: ${message.payload.message || message.payload.error || 'Неизвестная ошибка'}`,
              type: 'error',
              timestamp: new Date().toISOString()
            })
          }
          break
        case 'WORKFLOW_STEP':
          if (message.payload) {
            this.emit('workflowStep', message.payload as WorkflowStatusUpdate)
            // Добавляем детализированные логи шагов в чат
            if (message.payload.message) {
              this.emit('addAssistantMessage', {
                content: `🔧 ${message.payload.message}`,
                type: 'system',
                timestamp: new Date().toISOString()
              })
            }
          }
          break
        case 'WORKFLOW_STEP_COMPLETE':
          if (message.payload) {
            this.emit('workflowStepComplete', message.payload as WorkflowStatusUpdate)
            // Добавляем сообщение о завершении шага
            if (message.payload.result && message.payload.result.message) {
              this.emit('addAssistantMessage', {
                content: `✅ ${message.payload.result.message}`,
                type: 'success',
                timestamp: new Date().toISOString()
              })
            }
          }
          break
        case 'MCP_TOOL_RESULT':
          if (message.payload) {
            // Обработка результатов MCP операций
            this.emit('mcpToolResult', message.payload)
            const operationType = message.payload.operation || 'операция'
            const fileName = message.payload.filename || message.payload.path || ''
            const isSuccess = message.payload.status === 'completed' || message.payload.success
            
            if (isSuccess) {
              this.emit('addAssistantMessage', {
                content: `📁 Файл "${fileName}" успешно создан через MCP сервер`,
                type: 'success',
                timestamp: new Date().toISOString()
              })
            } else {
              this.emit('addAssistantMessage', {
                content: `❌ Ошибка при работе с файлом "${fileName}": ${message.payload.error || 'Неизвестная ошибка'}`,
                type: 'error',
                timestamp: new Date().toISOString()
              })
            }
          }
          break
        case 'ERROR':
          const errorPayload = {
            message: message.payload?.message || message.payload?.error || 'Unknown server error',
            code: message.payload?.code || 'SERVER_ERROR',
            ...message.payload
          }
          this.emit('error', errorPayload)
          break
        default:
          console.log('Received WebSocket message:', message.type, message.payload)
          break
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
      const errorData = {
        message: error instanceof Error ? error.message : 'Failed to parse message',
        code: 'PARSE_ERROR',
        originalError: error,
        rawData: event.data
      }
      this.emit('error', errorData)
    }
  }
  private startPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
    }
    this.pingInterval = setInterval(() => {
      this.sendPing()
    }, 30000) // Send ping every 30 seconds
  }
  private sendPing(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return
    // Just update the ping time without sending actual ping
    this.updateStatus({
      ...this.status,
      lastPingTime: Date.now()
    })
  }
  private handlePong(): void {
    if (this.pingTimeoutId) {
      clearTimeout(this.pingTimeoutId)
      this.pingTimeoutId = null
    }
    this.updateStatus({
      ...this.status,
      lastPingTime: Date.now()
    })
  }
  private scheduleReconnect(): void {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) // Exponential backoff
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error)
        })
      }
    }, delay)
  }
  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
    if (this.pingTimeoutId) {
      clearTimeout(this.pingTimeoutId)
      this.pingTimeoutId = null
    }
  }
  private updateStatus(newStatus: WebSocketConnectionStatus): void {
    this.status = { ...newStatus }
    this.emit('status', this.status)
  }
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  private transformMessage(rawMessage: any): WebSocketMessage {
    // Handle backend format: { type: string, payload: any }
    const message: WebSocketMessage = {
      type: rawMessage.type || 'UNKNOWN',
      timestamp: rawMessage.timestamp ? new Date(rawMessage.timestamp).toISOString() : new Date().toISOString(),
      messageId: rawMessage.id || rawMessage.messageId || this.generateMessageId(),
      payload: rawMessage.payload || rawMessage.data || {}
    }
    
    // Handle error messages
    if (rawMessage.type === 'ERROR' || rawMessage.type === 'error') {
      message.type = 'ERROR'
      if (rawMessage.error) {
        message.payload = {
          message: rawMessage.error,
          code: 'SERVER_ERROR',
          ...rawMessage.data
        }
      }
    }
    
    // Map backend event types to frontend message types
    switch (rawMessage.type) {
      case 'dslProgress':
        message.type = 'DSL_PROGRESS'
        break
      case 'dslResult':
        message.type = 'DSL_RESULT'
        break
      case 'workflowStart':
        message.type = 'WORKFLOW_START'
        break
      case 'nodeStatusUpdate':
        message.type = 'NODE_STATUS_UPDATE'
        break
      case 'workflowLog':
        message.type = 'WORKFLOW_LOG'
        break
      case 'workflowComplete':
        message.type = 'WORKFLOW_COMPLETE'
        break
      case 'workflowError':
        message.type = 'WORKFLOW_ERROR'
        break
      case 'chatMessage':
        message.type = 'CHAT_MESSAGE'
        break
    }
    
    return message
  }
  private transformToBackendFormat(message: WebSocketMessage): any {
    return {
      type: message.type,
      payload: message.payload || {}
    }
  }
  public on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }
  public off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback)
  }
  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in WebSocket event listener for '${event}':`, error)
        }
      })
    }
  }
  public getStatus(): WebSocketConnectionStatus {
    return { ...this.status }
  }
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.status.connected
  }
  public getWebSocket(): WebSocket | null {
    return this.ws
  }
  public onWorkflowStart(callback: (timeline: WorkflowExecutionTimeline) => void): () => void {
    return this.on('workflowStart', callback)
  }
  public onWorkflowStep(callback: (update: WorkflowStatusUpdate) => void): () => void {
    return this.on('workflowStep', callback)
  }
  public onWorkflowStepComplete(callback: (update: WorkflowStatusUpdate) => void): () => void {
    return this.on('workflowStepComplete', callback)
  }
  public onWorkflowProgress(callback: (timeline: WorkflowExecutionTimeline) => void): () => void {
    return this.on('workflowProgress', callback)
  }
  public onAgentAssignment(callback: (assignment: AgentAssignment) => void): () => void {
    return this.on('agentAssignment', callback)
  }
  public onToolInvocation(callback: (invocation: ToolInvocation) => void): () => void {
    return this.on('toolInvocation', callback)
  }
  public onWorkflowComplete(callback: (metrics: PerformanceMetrics) => void): () => void {
    return this.on('workflowComplete', callback)
  }
  public onPerformanceUpdate(callback: (metrics: PerformanceMetrics) => void): () => void {
    return this.on('performanceUpdate', callback)
  }
  private mapMessageTypeToStage(messageType: string): DSLAnalysisProgress['stage'] {
    switch (messageType) {
      case 'DSL_ANALYSIS_START':
        return 'analyzing'
      case 'AGENT_DISCOVERY':
        return 'discovering'
      case 'CAPABILITY_ANALYSIS':
        return 'matching'
      case 'WORKFLOW_GENERATION':
        return 'generating'
      case 'ANALYSIS_COMPLETE':
        return 'complete'
      default:
        return 'analyzing'
    }
  }
  private getDefaultProgressMessage(messageType: string): string {
    switch (messageType) {
      case 'DSL_ANALYSIS_START':
        return 'Starting DSL analysis...'
      case 'AGENT_DISCOVERY':
        return 'Discovering available agents...'
      case 'CAPABILITY_ANALYSIS':
        return 'Analyzing agent capabilities...'
      case 'WORKFLOW_GENERATION':
        return 'Generating workflow structure...'
      case 'ANALYSIS_COMPLETE':
        return 'Analysis complete!'
      case 'WORKFLOW_START':
        return 'Starting workflow execution...'
      case 'WORKFLOW_STEP':
        return 'Executing workflow step...'
      case 'WORKFLOW_STEP_COMPLETE':
        return 'Workflow step completed'
      case 'WORKFLOW_PROGRESS':
        return 'Workflow progressing...'
      case 'TASK_DELEGATION':
        return 'Delegating task to agent...'
      case 'TOOL_INVOCATION':
        return 'Invoking tool...'
      case 'WORKFLOW_COMPLETE':
        return 'Workflow execution completed!'
      case 'WORKFLOW_ERROR':
        return 'Workflow execution error'
      default:
        return 'Processing...'
    }
  }
}
let wsClient: WebSocketClient | null = null
export const getWebSocketClient = (): WebSocketClient => {
  if (!wsClient) {
    wsClient = new WebSocketClient()
  }
  return wsClient
}
export const createWebSocketClient = (url?: string): WebSocketClient => {
  return new WebSocketClient(url)
}