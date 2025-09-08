import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export class BackendMonitor {
  private containerLogs: string[] = []
  private monitoringStartTime: Date

  constructor() {
    this.monitoringStartTime = new Date()
    console.log('🔧 BackendMonitor initialized')
  }

  /**
   * Check Docker container logs for Praxis agents
   */
  async checkDockerLogs(containerName?: string): Promise<string[]> {
    const containers = containerName ? [containerName] : [
      'praxis-agent-1',
      'praxis-agent-2', 
      'praxis-orchestrator',
      'praxis-backend',
      'praxis-p2p'
    ]

    const allLogs: string[] = []

    for (const container of containers) {
      try {
        console.log(`📋 Checking logs for container: ${container}`)
        
        // Get logs from the last 30 seconds
        const { stdout, stderr } = await execAsync(
          `docker logs --since=30s ${container} 2>&1 || echo "Container ${container} not found or not running"`
        )
        
        if (stdout && !stdout.includes('not found') && !stdout.includes('not running')) {
          const logs = stdout.split('\n').filter(line => line.trim())
          allLogs.push(...logs.map(log => `[${container}] ${log}`))
          console.log(`✅ Found ${logs.length} log entries for ${container}`)
          
          // Store specific logs for analysis
          this.containerLogs.push(...logs.map(log => `[${container}] ${log}`))
        } else {
          console.log(`⚠️  Container ${container}: ${stdout || stderr || 'No output'}`)
        }
      } catch (error) {
        console.log(`❌ Error checking logs for ${container}: ${error}`)
        allLogs.push(`[${container}] ERROR: ${error}`)
      }
    }

    return allLogs
  }

  /**
   * Monitor P2P agent communication
   */
  async monitorP2PCommunication(): Promise<{
    discoveryEvents: string[],
    connectionEvents: string[],
    messageEvents: string[]
  }> {
    console.log('🌐 Monitoring P2P communication')
    
    const logs = await this.checkDockerLogs()
    
    const discoveryEvents = logs.filter(log => 
      log.toLowerCase().includes('discovery') ||
      log.toLowerCase().includes('peer') ||
      log.toLowerCase().includes('p2p')
    )
    
    const connectionEvents = logs.filter(log =>
      log.toLowerCase().includes('connect') ||
      log.toLowerCase().includes('disconnect') ||
      log.toLowerCase().includes('handshake')
    )
    
    const messageEvents = logs.filter(log =>
      log.toLowerCase().includes('message') ||
      log.toLowerCase().includes('request') ||
      log.toLowerCase().includes('response')
    )

    console.log(`🔍 P2P Analysis: ${discoveryEvents.length} discovery, ${connectionEvents.length} connection, ${messageEvents.length} message events`)

    return {
      discoveryEvents,
      connectionEvents,
      messageEvents
    }
  }

  /**
   * Check for MCP file operations in logs
   */
  async checkFileOperations(): Promise<{
    writeOperations: string[],
    readOperations: string[],
    mcpCalls: string[]
  }> {
    console.log('📁 Checking MCP file operations')
    
    const logs = await this.checkDockerLogs()
    
    const writeOperations = logs.filter(log =>
      log.toLowerCase().includes('write_file') ||
      log.toLowerCase().includes('file write') ||
      log.toLowerCase().includes('creating file')
    )
    
    const readOperations = logs.filter(log =>
      log.toLowerCase().includes('read_file') ||
      log.toLowerCase().includes('file read') ||
      log.toLowerCase().includes('reading file')
    )
    
    const mcpCalls = logs.filter(log =>
      log.toLowerCase().includes('mcp') ||
      log.toLowerCase().includes('tool call') ||
      log.toLowerCase().includes('filesystem')
    )

    console.log(`📊 File Operations: ${writeOperations.length} writes, ${readOperations.length} reads, ${mcpCalls.length} MCP calls`)

    return {
      writeOperations,
      readOperations,
      mcpCalls
    }
  }

  /**
   * Check for errors in backend logs
   */
  async checkForErrors(): Promise<{
    errors: string[],
    warnings: string[],
    criticalIssues: string[]
  }> {
    console.log('⚠️  Checking for backend errors')
    
    const logs = await this.checkDockerLogs()
    
    const errors = logs.filter(log =>
      log.toLowerCase().includes('error') ||
      log.toLowerCase().includes('failed') ||
      log.toLowerCase().includes('exception')
    )
    
    const warnings = logs.filter(log =>
      log.toLowerCase().includes('warning') ||
      log.toLowerCase().includes('warn') ||
      log.toLowerCase().includes('deprecated')
    )
    
    const criticalIssues = logs.filter(log =>
      log.toLowerCase().includes('panic') ||
      log.toLowerCase().includes('fatal') ||
      log.toLowerCase().includes('critical') ||
      log.toLowerCase().includes('crash')
    )

    if (errors.length > 0) {
      console.log(`❌ Found ${errors.length} errors in backend logs`)
      errors.slice(0, 3).forEach(error => console.log(`   ${error}`))
    }

    if (warnings.length > 0) {
      console.log(`⚠️  Found ${warnings.length} warnings in backend logs`)
    }

    if (criticalIssues.length > 0) {
      console.log(`🚨 Found ${criticalIssues.length} critical issues in backend logs`)
      criticalIssues.forEach(issue => console.log(`   ${issue}`))
    }

    return {
      errors,
      warnings,
      criticalIssues
    }
  }

  /**
   * Monitor workflow execution status
   */
  async monitorWorkflowExecution(): Promise<{
    executionStarts: string[],
    executionCompletions: string[],
    nodeStatusUpdates: string[]
  }> {
    console.log('⚡ Monitoring workflow execution')
    
    const logs = await this.checkDockerLogs()
    
    const executionStarts = logs.filter(log =>
      log.toLowerCase().includes('workflow start') ||
      log.toLowerCase().includes('execution start') ||
      log.toLowerCase().includes('executing workflow')
    )
    
    const executionCompletions = logs.filter(log =>
      log.toLowerCase().includes('workflow complete') ||
      log.toLowerCase().includes('execution complete') ||
      log.toLowerCase().includes('workflow finished')
    )
    
    const nodeStatusUpdates = logs.filter(log =>
      log.toLowerCase().includes('node status') ||
      log.toLowerCase().includes('status update') ||
      log.toLowerCase().includes('running') ||
      log.toLowerCase().includes('completed')
    )

    console.log(`📊 Workflow Monitoring: ${executionStarts.length} starts, ${executionCompletions.length} completions, ${nodeStatusUpdates.length} status updates`)

    return {
      executionStarts,
      executionCompletions,
      nodeStatusUpdates
    }
  }

  /**
   * Check recent activity across all monitored systems
   */
  async checkRecentActivity(): Promise<boolean> {
    console.log('🔍 Checking recent backend activity')
    
    try {
      const logs = await this.checkDockerLogs()
      const recentLogs = logs.filter(log => {
        // Consider logs from the last 60 seconds as recent
        const timestamp = this.extractTimestamp(log)
        if (timestamp) {
          const logTime = new Date(timestamp)
          const timeDiff = Date.now() - logTime.getTime()
          return timeDiff < 60000 // 60 seconds
        }
        return true // If no timestamp, assume recent
      })

      console.log(`📈 Recent activity: ${recentLogs.length} log entries in last 60 seconds`)
      return recentLogs.length > 0
    } catch (error) {
      console.log(`⚠️  Error checking recent activity: ${error}`)
      return false
    }
  }

  /**
   * Extract timestamp from log entry (basic implementation)
   */
  private extractTimestamp(log: string): string | null {
    // Try to match common timestamp patterns
    const timestampPatterns = [
      /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/,
      /\d{2}:\d{2}:\d{2}/,
      /\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/
    ]

    for (const pattern of timestampPatterns) {
      const match = log.match(pattern)
      if (match) {
        return match[0].replace(/[\[\]]/g, '')
      }
    }

    return null
  }

  /**
   * Check if specific containers are running
   */
  async checkContainerStatus(): Promise<{
    running: string[],
    stopped: string[],
    notFound: string[]
  }> {
    console.log('🐳 Checking Docker container status')
    
    const containers = [
      'praxis-agent-1',
      'praxis-agent-2',
      'praxis-orchestrator',
      'praxis-backend'
    ]

    const running: string[] = []
    const stopped: string[] = []
    const notFound: string[] = []

    for (const container of containers) {
      try {
        const { stdout } = await execAsync(`docker ps --filter "name=${container}" --format "{{.Names}}"`)
        
        if (stdout.trim().includes(container)) {
          running.push(container)
          console.log(`✅ Container ${container} is running`)
        } else {
          // Check if container exists but is stopped
          const { stdout: stoppedCheck } = await execAsync(`docker ps -a --filter "name=${container}" --format "{{.Names}}"`)
          
          if (stoppedCheck.trim().includes(container)) {
            stopped.push(container)
            console.log(`⏸️  Container ${container} exists but is stopped`)
          } else {
            notFound.push(container)
            console.log(`❌ Container ${container} not found`)
          }
        }
      } catch (error) {
        console.log(`⚠️  Error checking container ${container}: ${error}`)
        notFound.push(container)
      }
    }

    return { running, stopped, notFound }
  }

  /**
   * Monitor WebSocket connections (if accessible)
   */
  async checkWebSocketActivity(): Promise<{
    connectionAttempts: string[],
    messageExchanges: string[],
    connectionErrors: string[]
  }> {
    console.log('🌐 Checking WebSocket activity')
    
    const logs = await this.checkDockerLogs()
    
    const connectionAttempts = logs.filter(log =>
      log.toLowerCase().includes('websocket') ||
      log.toLowerCase().includes('ws connect') ||
      log.toLowerCase().includes('connection established')
    )
    
    const messageExchanges = logs.filter(log =>
      log.toLowerCase().includes('ws message') ||
      log.toLowerCase().includes('websocket message') ||
      log.toLowerCase().includes('socket emit')
    )
    
    const connectionErrors = logs.filter(log =>
      log.toLowerCase().includes('websocket error') ||
      log.toLowerCase().includes('connection failed') ||
      log.toLowerCase().includes('ws error')
    )

    console.log(`🔗 WebSocket Activity: ${connectionAttempts.length} connections, ${messageExchanges.length} messages, ${connectionErrors.length} errors`)

    return {
      connectionAttempts,
      messageExchanges,
      connectionErrors
    }
  }

  /**
   * Generate comprehensive status report
   */
  async generateStatusReport(): Promise<{
    timestamp: string,
    containers: { running: string[], stopped: string[], notFound: string[] },
    errors: { errors: string[], warnings: string[], criticalIssues: string[] },
    activity: { recentActivity: boolean, totalLogs: number },
    p2p: { discoveryEvents: string[], connectionEvents: string[], messageEvents: string[] },
    fileOps: { writeOperations: string[], readOperations: string[], mcpCalls: string[] },
    workflow: { executionStarts: string[], executionCompletions: string[], nodeStatusUpdates: string[] },
    websocket: { connectionAttempts: string[], messageExchanges: string[], connectionErrors: string[] }
  }> {
    console.log('📊 Generating comprehensive status report')
    
    const [containers, errors, p2p, fileOps, workflow, websocket] = await Promise.all([
      this.checkContainerStatus(),
      this.checkForErrors(),
      this.monitorP2PCommunication(),
      this.checkFileOperations(),
      this.monitorWorkflowExecution(),
      this.checkWebSocketActivity()
    ])

    const recentActivity = await this.checkRecentActivity()

    const report = {
      timestamp: new Date().toISOString(),
      containers,
      errors,
      activity: {
        recentActivity,
        totalLogs: this.containerLogs.length
      },
      p2p,
      fileOps,
      workflow,
      websocket
    }

    console.log('📋 Status Report Generated:')
    console.log(`  - Containers Running: ${containers.running.length}`)
    console.log(`  - Errors Found: ${errors.errors.length}`)
    console.log(`  - Recent Activity: ${recentActivity}`)
    console.log(`  - P2P Events: ${p2p.discoveryEvents.length + p2p.connectionEvents.length + p2p.messageEvents.length}`)
    console.log(`  - File Operations: ${fileOps.writeOperations.length + fileOps.readOperations.length}`)

    return report
  }

  /**
   * Wait for specific log pattern to appear
   */
  async waitForLogPattern(pattern: string | RegExp, timeout: number = 30000): Promise<boolean> {
    console.log(`⏳ Waiting for log pattern: ${pattern}`)
    
    const startTime = Date.now()
    const checkInterval = 2000 // Check every 2 seconds

    while (Date.now() - startTime < timeout) {
      const logs = await this.checkDockerLogs()
      
      const matchingLogs = logs.filter(log => {
        if (typeof pattern === 'string') {
          return log.toLowerCase().includes(pattern.toLowerCase())
        } else {
          return pattern.test(log)
        }
      })

      if (matchingLogs.length > 0) {
        console.log(`✅ Found matching log pattern: ${matchingLogs[0]}`)
        return true
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval))
    }

    console.log(`⏰ Timeout waiting for log pattern: ${pattern}`)
    return false
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    console.log('🧹 BackendMonitor cleanup')
    
    // Clear stored logs to free memory
    this.containerLogs = []
    
    // Could add cleanup for any persistent monitoring processes here
    console.log('✅ BackendMonitor cleanup completed')
  }
}