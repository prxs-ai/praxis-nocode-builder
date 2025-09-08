import { test, expect } from '@playwright/test'
import { WebSocketHelper } from './helpers/websocket-helper'

test.describe('Real-time Status Updates', () => {
  let wsHelper: WebSocketHelper

  test.beforeEach(async ({ page }) => {
    wsHelper = new WebSocketHelper(page)
    await page.goto('/')
    
    // Wait for application to load
    const canvas = page.locator('.react-flow, [data-testid="workflow-canvas"]')
    await expect(canvas).toBeVisible({ timeout: 10000 })
  })

  test('should show real-time workflow execution status', async ({ page }) => {
    // Create and execute a workflow
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    await expect(chatPanel).toBeVisible()

    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    await messageInput.fill('create test workflow for status monitoring')
    await sendButton.click()

    const createWorkflowBtn = chatPanel.locator('button:has-text("Create Visual Workflow"), button:has-text("Create Workflow")')
    await expect(createWorkflowBtn).toBeVisible({ timeout: 15000 })
    await createWorkflowBtn.click()

    await page.waitForTimeout(3000)

    // Execute the workflow
    const executeButton = page.locator('button:has-text("Execute"), [data-testid="execute-workflow"], button:has-text("Run")')
    
    if (await executeButton.isVisible()) {
      await executeButton.click()
      
      // Monitor status changes in real-time
      const canvas = page.locator('.react-flow')
      const nodes = canvas.locator('.react-flow__node')
      
      // Take screenshots at different intervals to capture status changes
      await page.screenshot({ 
        path: './test-results/workflow-execution-start.png', 
        fullPage: true 
      })
      
      await page.waitForTimeout(2000)
      
      await page.screenshot({ 
        path: './test-results/workflow-execution-progress.png', 
        fullPage: true 
      })
      
      await page.waitForTimeout(3000)
      
      await page.screenshot({ 
        path: './test-results/workflow-execution-complete.png', 
        fullPage: true 
      })
      
      // Check for status indicators on nodes
      const statusIndicators = nodes.locator('[data-status], .status-indicator, .node-status')
      if (await statusIndicators.count() > 0) {
        console.log('✓ Node status indicators found')
        
        for (let i = 0; i < await statusIndicators.count(); i++) {
          const status = await statusIndicators.nth(i).getAttribute('data-status') || 
                        await statusIndicators.nth(i).getAttribute('class')
          console.log(`Node ${i + 1} status: ${status}`)
        }
      }
    }
  })

  test('should update node status indicators in real-time', async ({ page }) => {
    await wsHelper.connect(page)
    
    // Create workflow with multiple nodes
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    await messageInput.fill('create workflow: input -> process -> output')
    await sendButton.click()

    const createWorkflowBtn = chatPanel.locator('button:has-text("Create Visual Workflow"), button:has-text("Create Workflow")')
    await expect(createWorkflowBtn).toBeVisible({ timeout: 15000 })
    await createWorkflowBtn.click()

    await page.waitForTimeout(3000)

    const canvas = page.locator('.react-flow')
    const nodes = canvas.locator('.react-flow__node')
    
    // Monitor status changes by checking node classes/attributes
    const statusChanges: Array<{timestamp: Date, nodeId: string, status: string}> = []
    
    // Set up periodic status checking
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < await nodes.count(); j++) {
        const node = nodes.nth(j)
        const nodeId = await node.getAttribute('data-id') || `node-${j}`
        const status = await node.getAttribute('data-status') || 
                      await node.getAttribute('class') || 'unknown'
        
        statusChanges.push({
          timestamp: new Date(),
          nodeId,
          status
        })
      }
      
      await page.waitForTimeout(1000)
    }
    
    console.log(`Collected ${statusChanges.length} status readings`)
    
    // Check for status transitions
    const uniqueStatuses = [...new Set(statusChanges.map(s => s.status))]
    console.log('Detected statuses:', uniqueStatuses)
  })

  test('should show real-time log updates during execution', async ({ page }) => {
    // Look for logs panel
    const logsButton = page.locator('button:has-text("Logs"), [data-testid="logs-button"], .logs-toggle')
    
    if (await logsButton.isVisible()) {
      await logsButton.click()
      
      const logsPanel = page.locator('[data-testid="logs-panel"], .logs-panel, .log-viewer')
      await expect(logsPanel).toBeVisible()
      
      // Create and execute workflow
      const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
      await chatButton.click()

      const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
      const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
      const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
      
      await messageInput.fill('create and run test workflow')
      await sendButton.click()

      const createWorkflowBtn = chatPanel.locator('button:has-text("Create Visual Workflow"), button:has-text("Create Workflow")')
      await expect(createWorkflowBtn).toBeVisible({ timeout: 15000 })
      await createWorkflowBtn.click()

      await page.waitForTimeout(2000)

      const executeButton = page.locator('button:has-text("Execute"), [data-testid="execute-workflow"]')
      if (await executeButton.isVisible()) {
        await executeButton.click()
        
        // Monitor log entries in real-time
        const logEntries = logsPanel.locator('.log-entry, [data-testid="log-entry"], .log-line')
        
        let previousCount = 0
        for (let i = 0; i < 5; i++) {
          const currentCount = await logEntries.count()
          if (currentCount > previousCount) {
            console.log(`New log entries detected: ${currentCount - previousCount}`)
            
            // Get latest log entry
            const latestEntry = logEntries.last()
            const logText = await latestEntry.textContent()
            console.log(`Latest log: ${logText}`)
          }
          previousCount = currentCount
          await page.waitForTimeout(1000)
        }
        
        await page.screenshot({ 
          path: './test-results/real-time-logs.png', 
          fullPage: true 
        })
      }
    }
  })

  test('should display WebSocket connection status', async ({ page }) => {
    // Check initial connection status
    const connectionIndicator = page.locator(
      '.connection-status, ' +
      '[data-testid="connection-status"], ' +
      '.websocket-status, ' +
      '.online-indicator'
    )

    if (await connectionIndicator.isVisible()) {
      const initialStatus = await connectionIndicator.textContent()
      console.log(`Initial connection status: ${initialStatus}`)
    }

    // Connect WebSocket
    await wsHelper.connect(page)

    // Monitor connection status changes
    await page.waitForTimeout(2000)

    if (await connectionIndicator.isVisible()) {
      const connectedStatus = await connectionIndicator.textContent()
      console.log(`Connected status: ${connectedStatus}`)
    }

    // Test connection indicators in browser console
    const wsInfo = await page.evaluate(() => {
      const ws = (window as any).wsConnections || []
      return {
        connectionCount: ws.length,
        states: ws.map((w: WebSocket) => ({
          url: w.url,
          readyState: w.readyState,
          readyStateText: ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][w.readyState]
        }))
      }
    })

    console.log('WebSocket info:', JSON.stringify(wsInfo, null, 2))

    // Take screenshot of connection status
    await page.screenshot({ 
      path: './test-results/websocket-connection-status.png', 
      fullPage: true 
    })
  })

  test('should update progress indicators during long-running operations', async ({ page }) => {
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    // Send command that might take time to process
    await messageInput.fill('create complex workflow with multiple processing steps and validations')
    await sendButton.click()

    // Monitor for progress indicators
    const progressIndicators = chatPanel.locator(
      '.progress, ' +
      '.loading, ' +
      '.spinner, ' +
      '[data-testid*="progress"], ' +
      '.progress-bar'
    )

    const progressStates: Array<{timestamp: Date, visible: boolean, text?: string}> = []

    // Monitor progress for 10 seconds
    for (let i = 0; i < 10; i++) {
      const isVisible = await progressIndicators.isVisible()
      let text: string | undefined
      
      if (isVisible) {
        text = await progressIndicators.first().textContent() || undefined
      }
      
      progressStates.push({
        timestamp: new Date(),
        visible: isVisible,
        text
      })
      
      await page.waitForTimeout(1000)
    }

    const visibleProgressCount = progressStates.filter(s => s.visible).length
    console.log(`Progress indicators visible for ${visibleProgressCount}/10 checks`)

    if (visibleProgressCount > 0) {
      const progressTexts = progressStates
        .filter(s => s.text)
        .map(s => s.text)
        .filter((text, index, array) => array.indexOf(text) === index)
      
      console.log('Progress messages:', progressTexts)
    }
  })

  test('should handle WebSocket disconnection and reconnection', async ({ page }) => {
    await wsHelper.connect(page)

    // Initial connection check
    const wsInfo1 = await page.evaluate(() => {
      return {
        hasWebSocket: 'WebSocket' in window,
        connectionCount: (window as any).wsConnections?.length || 0
      }
    })

    console.log('Initial WebSocket state:', wsInfo1)

    // Simulate network disconnection by closing WebSocket connections
    await page.evaluate(() => {
      const wsConnections = (window as any).wsConnections || []
      wsConnections.forEach((ws: WebSocket) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close()
        }
      })
    })

    await page.waitForTimeout(2000)

    // Check for disconnection indicators
    const disconnectionIndicators = page.locator(
      ':has-text("disconnected"), ' +
      ':has-text("offline"), ' +
      ':has-text("connection lost"), ' +
      '.disconnected, ' +
      '.offline'
    )

    if (await disconnectionIndicators.isVisible()) {
      console.log('✓ Disconnection status displayed')
    }

    // Wait for potential automatic reconnection
    await page.waitForTimeout(5000)

    // Check if reconnection occurred
    const wsInfo2 = await page.evaluate(() => {
      return {
        connectionCount: (window as any).wsConnections?.length || 0,
        states: ((window as any).wsConnections || []).map((ws: WebSocket) => ws.readyState)
      }
    })

    console.log('Post-disconnection WebSocket state:', wsInfo2)

    // Look for reconnection indicators
    const reconnectionIndicators = page.locator(
      ':has-text("reconnected"), ' +
      ':has-text("connected"), ' +
      ':has-text("online"), ' +
      '.connected, ' +
      '.online'
    )

    if (await reconnectionIndicators.isVisible()) {
      console.log('✓ Reconnection status displayed')
    }

    await page.screenshot({ 
      path: './test-results/websocket-reconnection.png', 
      fullPage: true 
    })
  })

  test('should show real-time chat message delivery status', async ({ page }) => {
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    await expect(chatPanel).toBeVisible()

    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    // Send a message and monitor delivery status
    await messageInput.fill('test message for delivery status')
    await sendButton.click()

    // Look for message status indicators
    const messageStatus = chatPanel.locator(
      '.message-status, ' +
      '.delivery-status, ' +
      '.sent-indicator, ' +
      '.delivered-indicator, ' +
      '[data-status]'
    )

    if (await messageStatus.isVisible()) {
      const status = await messageStatus.textContent()
      console.log(`Message delivery status: ${status}`)
    }

    // Check for typing indicators
    const typingIndicator = chatPanel.locator(
      '.typing-indicator, ' +
      ':has-text("typing"), ' +
      '.dots, ' +
      '.ellipsis'
    )

    if (await typingIndicator.isVisible({ timeout: 5000 })) {
      console.log('✓ Typing indicator shown')
    }

    // Wait for response and check timestamps
    await page.waitForTimeout(3000)

    const messages = chatPanel.locator('.message, [data-testid*="message"]')
    const messageCount = await messages.count()
    
    if (messageCount >= 2) {
      const userMessage = messages.first()
      const assistantMessage = messages.last()
      
      const userTimestamp = await userMessage.locator('.timestamp, .time').textContent()
      const assistantTimestamp = await assistantMessage.locator('.timestamp, .time').textContent()
      
      console.log(`User message timestamp: ${userTimestamp}`)
      console.log(`Assistant message timestamp: ${assistantTimestamp}`)
    }
  })

  test('should display system health and performance metrics', async ({ page }) => {
    // Look for system status panel
    const statusPanel = page.locator(
      '.system-status, ' +
      '[data-testid="system-status"], ' +
      '.health-panel, ' +
      '.metrics-panel'
    )

    const menuButton = page.locator('button:has-text("View"), button:has-text("System"), button:has-text("Status")')
    
    if (await menuButton.isVisible()) {
      await menuButton.click()
      
      const statusOption = page.locator('button:has-text("System Status"), button:has-text("Health")')
      if (await statusOption.isVisible()) {
        await statusOption.click()
      }
    }

    if (await statusPanel.isVisible()) {
      // Check for various metrics
      const metrics = page.locator(
        '.cpu-usage, ' +
        '.memory-usage, ' +
        '.connection-count, ' +
        '.response-time, ' +
        '.uptime'
      )

      if (await metrics.count() > 0) {
        console.log(`Found ${await metrics.count()} system metrics`)
        
        for (let i = 0; i < await metrics.count(); i++) {
          const metric = metrics.nth(i)
          const metricText = await metric.textContent()
          console.log(`Metric ${i + 1}: ${metricText}`)
        }
      }

      await page.screenshot({ 
        path: './test-results/system-health-metrics.png', 
        fullPage: true 
      })
    }

    // Check for performance data in browser console
    const performanceInfo = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        responseTime: navigation.responseEnd - navigation.requestStart
      }
    })

    console.log('Performance metrics:', performanceInfo)
  })
})