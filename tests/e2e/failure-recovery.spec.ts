import { test, expect } from '@playwright/test'
import { WebSocketHelper } from './helpers/websocket-helper'
import { UIHelper } from './helpers/ui-helper'
import { execSync } from 'child_process'

test.describe('E2E-FAIL: Failure Recovery Tests', () => {
  let wsHelper: WebSocketHelper
  let uiHelper: UIHelper

  test.beforeEach(async ({ page }) => {
    wsHelper = new WebSocketHelper(page)
    uiHelper = new UIHelper(page)
    
    await page.goto('/')
    await uiHelper.openChat(page)
    await wsHelper.connect(page)
  })

  test('E2E-FAIL-01: Agent failure during workflow execution', async ({ page }) => {
    // Start a workflow that involves agent-2
    const dslCommand = 'CALL write_file test-fail.txt "Testing failure"'
    await wsHelper.sendMessage(page, dslCommand)
    
    // Wait for DSL result
    const dslResult = await wsHelper.waitForDSLResult(page)
    const createButton = dslResult.locator('button:has-text("Create Visual Workflow")')
    await createButton.click()
    
    // Start execution
    await uiHelper.executeWorkflow(page)
    
    // Wait for first node to complete
    const canvas = page.locator('[data-testid="workflow-canvas"], .react-flow')
    const nodes = canvas.locator('.react-flow__node')
    const nodeIds = await nodes.evaluateAll(elements => 
      elements.map(el => el.getAttribute('data-id') || el.id)
    )
    
    if (nodeIds.length >= 2) {
      // Wait for first node to succeed
      await uiHelper.waitForNodeStatus(page, nodeIds[0], 'success', 10000)
      
      // When second node is running, stop agent-2
      await uiHelper.waitForNodeStatus(page, nodeIds[1], 'running', 5000)
      
      // Simulate agent-2 failure
      try {
        execSync('docker-compose stop praxis-agent-2', { 
          cwd: process.cwd(),
          timeout: 5000 
        })
      } catch (error) {
        console.log('Note: docker-compose stop command failed, test may not work as expected')
      }
      
      // Second node should transition to error state
      await uiHelper.waitForNodeStatus(page, nodeIds[1], 'error', 15000)
      
      // Check for error messages
      await uiHelper.openLogsPanel(page)
      const errorLog = await uiHelper.checkLogEntry(page, /error|fail|unreachable|connection lost/i, 'error')
      await expect(errorLog).toBeVisible()
      
      // Check chat for error message
      const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel')
      await expect(chatPanel).toContainText(/error|failed|unreachable/i, { timeout: 10000 })
      
      // Restart agent-2 for other tests
      try {
        execSync('docker-compose start praxis-agent-2', { 
          cwd: process.cwd(),
          timeout: 5000 
        })
      } catch (error) {
        console.log('Note: docker-compose start command failed')
      }
    }
  })

  test('E2E-FAIL-02: WebSocket disconnection and reconnection', async ({ page, context }) => {
    // Start a long-running workflow
    const dslCommand = 'WORKFLOW START "long running process"'
    await wsHelper.sendMessage(page, dslCommand)
    
    // Simulate network disconnection
    await context.setOffline(true)
    
    // Wait for disconnection to be detected
    await page.waitForTimeout(2000)
    
    // Check status changed to disconnected
    const status = await wsHelper.getConnectionStatus(page)
    expect(status).toMatch(/disconnect/i)
    
    // Check that input is disabled
    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel')
    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"]')
    await expect(messageInput).toBeDisabled()
    
    // Wait 5 seconds
    await page.waitForTimeout(5000)
    
    // Restore network connection
    await context.setOffline(false)
    
    // Should auto-reconnect or allow manual reconnect
    const connectButton = chatPanel.locator('button:has-text("Connect")')
    if (await connectButton.isVisible()) {
      // Manual reconnect needed
      await connectButton.click()
    }
    
    // Wait for reconnection
    await expect(chatPanel.locator('[data-testid="connection-status"], .connection-status'))
      .toContainText(/connected/i, { timeout: 10000 })
    
    // Input should be enabled again
    await expect(messageInput).toBeEnabled()
    
    // Should be able to send messages again
    await wsHelper.sendMessage(page, 'Test after reconnection')
    const userMessage = chatPanel.locator('.message.user').last()
    await expect(userMessage).toContainText('Test after reconnection')
  })

  test('E2E-FAIL-03: Multiple reconnection attempts', async ({ page, context }) => {
    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel')
    const statusIndicator = chatPanel.locator('[data-testid="connection-status"], .connection-status')
    
    // Perform multiple disconnect/reconnect cycles
    for (let i = 0; i < 3; i++) {
      // Disconnect
      await context.setOffline(true)
      await page.waitForTimeout(1000)
      await expect(statusIndicator).toContainText(/disconnect/i, { timeout: 5000 })
      
      // Reconnect
      await context.setOffline(false)
      await page.waitForTimeout(1000)
      
      // Try to reconnect
      const connectButton = chatPanel.locator('button:has-text("Connect")')
      if (await connectButton.isVisible()) {
        await connectButton.click()
      }
      
      await expect(statusIndicator).toContainText(/connected/i, { timeout: 10000 })
    }
    
    // After multiple reconnections, should still work
    await wsHelper.sendMessage(page, 'Still working after reconnections')
    await wsHelper.waitForMessage(page, 'user', 'Still working after reconnections')
  })

  test('E2E-FAIL-04: Workflow recovery after reconnection', async ({ page, context }) => {
    // Create a simple workflow
    await uiHelper.clearCanvas(page)
    await uiHelper.dragNodeToCanvas(page, 'agent', { x: 100, y: 100 })
    await uiHelper.dragNodeToCanvas(page, 'tool', { x: 300, y: 100 })
    
    const canvas = page.locator('[data-testid="workflow-canvas"], .react-flow')
    const nodes = canvas.locator('.react-flow__node')
    const nodeIds = await nodes.evaluateAll(elements => 
      elements.map(el => el.getAttribute('data-id') || el.id)
    )
    
    // Start execution
    await uiHelper.executeWorkflow(page)
    await uiHelper.waitForNodeStatus(page, nodeIds[0], 'running', 5000)
    
    // Disconnect during execution
    await context.setOffline(true)
    await page.waitForTimeout(2000)
    
    // Reconnect
    await context.setOffline(false)
    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel')
    const connectButton = chatPanel.locator('button:has-text("Connect")')
    if (await connectButton.isVisible()) {
      await connectButton.click()
    }
    
    // Wait for reconnection
    await expect(chatPanel.locator('[data-testid="connection-status"], .connection-status'))
      .toContainText(/connected/i, { timeout: 10000 })
    
    // UI should request and display current workflow status
    // Nodes should show their actual status (workflow continued on backend)
    const node1Status = await uiHelper.getNodeStatus(page, nodeIds[0])
    expect(['running', 'success', 'error']).toContain(node1Status)
    
    // If workflow completed on backend, should show completion
    if (node1Status === 'success') {
      const completionMessage = chatPanel.locator('.message.assistant').filter({ hasText: /complet/i })
      await expect(completionMessage).toBeVisible({ timeout: 5000 })
    }
  })
})