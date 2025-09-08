import { test, expect } from '@playwright/test'
import { WebSocketHelper } from './helpers/websocket-helper'
import { UIHelper } from './helpers/ui-helper'
import * as fs from 'fs'
import * as path from 'path'

test.describe('E2E-EXEC: Workflow Execution Tests', () => {
  let wsHelper: WebSocketHelper
  let uiHelper: UIHelper
  const sharedDir = path.join(process.cwd(), '..', '..', 'shared')
  const testFile = path.join(sharedDir, 'e2e-test.txt')

  test.beforeEach(async ({ page }) => {
    wsHelper = new WebSocketHelper(page)
    uiHelper = new UIHelper(page)
    
    // Create test file for read operations
    if (!fs.existsSync(sharedDir)) {
      fs.mkdirSync(sharedDir, { recursive: true })
    }
    fs.writeFileSync(testFile, 'Test content for E2E workflow')
    
    await page.goto('/')
    await uiHelper.openChat(page)
    await wsHelper.connect(page)
  })

  test.afterEach(async () => {
    // Clean up
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile)
    }
  })

  test('E2E-EXEC-01: Execute manually created workflow', async ({ page }) => {
    // Clear canvas first
    await uiHelper.clearCanvas(page)
    
    // Step 1: Drag nodes to canvas
    await uiHelper.dragNodeToCanvas(page, 'agent', { x: 100, y: 100 })
    await uiHelper.dragNodeToCanvas(page, 'tool', { x: 300, y: 100 })
    await uiHelper.dragNodeToCanvas(page, 'agent', { x: 500, y: 100 })
    
    // Wait for nodes to be created
    const canvas = page.locator('[data-testid="workflow-canvas"], .react-flow')
    const nodes = canvas.locator('.react-flow__node')
    await expect(nodes).toHaveCount(3, { timeout: 5000 })
    
    // Get node IDs
    const nodeIds = await nodes.evaluateAll(elements => 
      elements.map(el => el.getAttribute('data-id') || el.id)
    )
    
    // Step 2: Connect nodes sequentially
    if (nodeIds.length >= 3) {
      await uiHelper.connectNodes(page, nodeIds[0], nodeIds[1])
      await uiHelper.connectNodes(page, nodeIds[1], nodeIds[2])
    }
    
    // Verify connections
    const edges = canvas.locator('.react-flow__edge')
    await expect(edges).toHaveCount(2, { timeout: 5000 })
    
    // Step 3: Configure second agent node for praxis-agent-2
    await uiHelper.configureNode(page, nodeIds[2], {
      agent: 'praxis-agent-2',
      label: 'Agent 2'
    })
    
    // Step 4: Configure tool node for read_file
    await uiHelper.configureNode(page, nodeIds[1], {
      tool: 'read_file',
      filename: 'e2e-test.txt',
      label: 'Read File'
    })
    
    // Step 5: Execute workflow
    await uiHelper.executeWorkflow(page)
    
    // Monitor node status changes
    for (const nodeId of nodeIds) {
      // Each node should transition through states
      await uiHelper.waitForNodeStatus(page, nodeId, 'running', 10000)
      await uiHelper.waitForNodeStatus(page, nodeId, 'success', 15000)
    }
    
    // Check logs
    await uiHelper.openLogsPanel(page)
    await uiHelper.checkLogEntry(page, /read_file/, 'info')
    await uiHelper.checkLogEntry(page, /e2e-test\.txt/, 'info')
    
    // Check for file content in chat/logs
    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel')
    await expect(chatPanel).toContainText('Test content for E2E workflow', { timeout: 10000 })
  })

  test('E2E-EXEC-02: Execute workflow with parallel nodes', async ({ page }) => {
    await uiHelper.clearCanvas(page)
    
    // Create a workflow with parallel execution
    // Start -> [Tool1, Tool2] -> End
    await uiHelper.dragNodeToCanvas(page, 'agent', { x: 100, y: 200 })  // Start
    await uiHelper.dragNodeToCanvas(page, 'tool', { x: 300, y: 150 })   // Tool1
    await uiHelper.dragNodeToCanvas(page, 'tool', { x: 300, y: 250 })   // Tool2
    await uiHelper.dragNodeToCanvas(page, 'agent', { x: 500, y: 200 })  // End
    
    const canvas = page.locator('[data-testid="workflow-canvas"], .react-flow')
    const nodes = canvas.locator('.react-flow__node')
    await expect(nodes).toHaveCount(4, { timeout: 5000 })
    
    const nodeIds = await nodes.evaluateAll(elements => 
      elements.map(el => el.getAttribute('data-id') || el.id)
    )
    
    // Connect: Start -> Tool1, Start -> Tool2, Tool1 -> End, Tool2 -> End
    await uiHelper.connectNodes(page, nodeIds[0], nodeIds[1])
    await uiHelper.connectNodes(page, nodeIds[0], nodeIds[2])
    await uiHelper.connectNodes(page, nodeIds[1], nodeIds[3])
    await uiHelper.connectNodes(page, nodeIds[2], nodeIds[3])
    
    // Execute and verify parallel execution
    await uiHelper.executeWorkflow(page)
    
    // Both tools should be running at the same time
    await uiHelper.waitForNodeStatus(page, nodeIds[1], 'running', 10000)
    await uiHelper.waitForNodeStatus(page, nodeIds[2], 'running', 10000)
    
    // Verify both tools show running status simultaneously
    const tool1Status = await uiHelper.getNodeStatus(page, nodeIds[1])
    const tool2Status = await uiHelper.getNodeStatus(page, nodeIds[2])
    expect(tool1Status).toBe('running')
    expect(tool2Status).toBe('running')
    
    // Wait for completion
    await uiHelper.waitForNodeStatus(page, nodeIds[3], 'success', 20000)
  })
})