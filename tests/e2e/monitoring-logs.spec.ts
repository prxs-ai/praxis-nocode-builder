import { test, expect } from '@playwright/test'
import { WebSocketHelper } from './helpers/websocket-helper'
import { UIHelper } from './helpers/ui-helper'

test.describe('E2E-LOG: Monitoring and Logging Tests', () => {
  let wsHelper: WebSocketHelper
  let uiHelper: UIHelper

  test.beforeEach(async ({ page }) => {
    wsHelper = new WebSocketHelper(page)
    uiHelper = new UIHelper(page)
    
    await page.goto('/')
    await uiHelper.openChat(page)
    await wsHelper.connect(page)
  })

  test('E2E-LOG-01: End-to-end logging from P2P agents', async ({ page }) => {
    // Start a DSL command to generate logs
    const dslCommand = 'CALL analyze_dsl "test workflow"'
    await wsHelper.sendMessage(page, dslCommand)
    
    // Wait for DSL result
    await wsHelper.waitForDSLResult(page)
    
    // Click "Create Visual Workflow" if available
    const dslResult = page.locator('[data-testid="dsl-result"], .dsl-result')
    const createButton = dslResult.locator('button:has-text("Create Visual Workflow")')
    if (await createButton.count() > 0 && await createButton.isEnabled()) {
      await createButton.click()
      
      // Execute workflow
      await uiHelper.executeWorkflow(page)
    }
    
    // Open logs panel
    await uiHelper.openLogsPanel(page)
    
    // Step 1: Verify logs from different agents
    const agent1Log = await uiHelper.checkLogEntry(page, /\[agent-1\]|\[praxis-agent-1\]/i, 'info')
    await expect(agent1Log).toBeVisible()
    
    // Check for agent-2 logs if multi-agent operation
    const logsPanel = page.locator('[data-testid="logs-panel"], .logs-panel')
    const agent2LogCount = await logsPanel.locator('text=/\\[agent-2\\]|\\[praxis-agent-2\\]/i').count()
    if (agent2LogCount > 0) {
      const agent2Log = await uiHelper.checkLogEntry(page, /\[agent-2\]|\[praxis-agent-2\]/i, 'info')
      await expect(agent2Log).toBeVisible()
    }
    
    // Step 2: Verify P2P connection logs
    const p2pLog = await uiHelper.checkLogEntry(page, /P2P|peer|connect/i)
    await expect(p2pLog).toBeVisible()
    
    // Step 3: Verify MCP tool invocation logs
    const mcpLog = await uiHelper.checkLogEntry(page, /MCP|tool|invoke/i)
    await expect(mcpLog).toBeVisible()
    
    // Step 4: Verify log levels and icons
    const infoLogs = logsPanel.locator('[data-level="info"]')
    await expect(infoLogs.first()).toBeVisible()
    
    // Check for proper icon display
    const logIcon = infoLogs.first().locator('.log-icon, [data-testid="log-icon"]')
    if (await logIcon.count() > 0) {
      await expect(logIcon).toBeVisible()
    }
  })

  test('E2E-LOG-02: Clickable logs and node highlighting', async ({ page }) => {
    // Create a simple workflow first
    await uiHelper.clearCanvas(page)
    await uiHelper.dragNodeToCanvas(page, 'agent', { x: 100, y: 100 })
    await uiHelper.dragNodeToCanvas(page, 'tool', { x: 300, y: 100 })
    
    const canvas = page.locator('[data-testid="workflow-canvas"], .react-flow')
    const nodes = canvas.locator('.react-flow__node')
    const nodeIds = await nodes.evaluateAll(elements => 
      elements.map(el => el.getAttribute('data-id') || el.id)
    )
    
    // Connect nodes
    if (nodeIds.length >= 2) {
      await uiHelper.connectNodes(page, nodeIds[0], nodeIds[1])
    }
    
    // Execute workflow
    await uiHelper.executeWorkflow(page)
    
    // Wait for execution to start
    await uiHelper.waitForNodeStatus(page, nodeIds[0], 'running', 10000)
    
    // Open logs panel
    await uiHelper.openLogsPanel(page)
    
    // Step 1: Find a log entry with nodeId
    const logsPanel = page.locator('[data-testid="logs-panel"], .logs-panel')
    
    // Wait for logs with nodeId
    const nodeIdPattern = new RegExp(`nodeId.*${nodeIds[0]}|${nodeIds[0]}`, 'i')
    const logWithNodeId = await uiHelper.checkLogEntry(page, nodeIdPattern)
    await expect(logWithNodeId).toBeVisible()
    
    // Step 2: Click on the nodeId in the log
    const nodeIdLink = logWithNodeId.locator(`[data-node-id="${nodeIds[0]}"], a:has-text("${nodeIds[0]}")`)
    if (await nodeIdLink.count() > 0) {
      await nodeIdLink.click()
      
      // Step 3: Verify node is highlighted/centered
      const targetNode = canvas.locator(`[data-id="${nodeIds[0]}"], #${nodeIds[0]}`)
      
      // Check if node is highlighted
      const isHighlighted = await uiHelper.isNodeHighlighted(page, nodeIds[0])
      expect(isHighlighted).toBeTruthy()
      
      // Check if node is in viewport (centered)
      const isInViewport = await targetNode.isIntersectingViewport()
      expect(isInViewport).toBeTruthy()
    }
  })

  test('E2E-LOG-03: Real-time log streaming', async ({ page }) => {
    // Open logs panel first
    await uiHelper.openLogsPanel(page)
    
    const logsPanel = page.locator('[data-testid="logs-panel"], .logs-panel')
    const initialLogCount = await logsPanel.locator('.log-entry, [data-testid="log-entry"]').count()
    
    // Execute a DSL command to generate new logs
    const dslCommand = 'WORKFLOW START "streaming test"'
    await wsHelper.sendMessage(page, dslCommand)
    
    // Wait for new logs to appear
    await page.waitForTimeout(2000)
    
    const newLogCount = await logsPanel.locator('.log-entry, [data-testid="log-entry"]').count()
    
    // Should have more logs than initially
    expect(newLogCount).toBeGreaterThan(initialLogCount)
    
    // Verify logs appear in real-time (newest first or last)
    const latestLog = logsPanel.locator('.log-entry, [data-testid="log-entry"]').last()
    await expect(latestLog).toContainText(/streaming test/i)
  })
})