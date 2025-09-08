import { test, expect } from '@playwright/test'
import { WebSocketHelper } from './helpers/websocket-helper'
import { UIHelper } from './helpers/ui-helper'
import * as fs from 'fs'
import * as path from 'path'

test.describe('E2E-DSL: DSL Command Tests', () => {
  let wsHelper: WebSocketHelper
  let uiHelper: UIHelper
  const sharedDir = path.join(process.cwd(), '..', '..', 'shared')
  const testFile = path.join(sharedDir, 'e2e-test.txt')

  test.beforeEach(async ({ page }) => {
    wsHelper = new WebSocketHelper(page)
    uiHelper = new UIHelper(page)
    
    // Clean up test file if exists
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile)
    }
    
    await page.goto('/')
    await uiHelper.openChat(page)
    await wsHelper.connect(page)
  })

  test.afterEach(async () => {
    // Clean up test file
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile)
    }
  })

  test('E2E-DSL-01: Successful file operation through DSL (KEY SCENARIO)', async ({ page }) => {
    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel')
    
    // Step 1: Enter DSL command in chat
    const dslCommand = 'CALL write_file e2e-test.txt "E2E test successful"'
    await wsHelper.sendMessage(page, dslCommand)
    
    // Verify message is highlighted as DSL
    const userMessage = chatPanel.locator('.message.user, [data-sender="user"]').last()
    await expect(userMessage).toHaveClass(/dsl|highlighted/)
    
    // Step 2: Wait for DSL Progress widget
    const dslProgress = page.locator('[data-testid="dsl-progress"], .dsl-progress')
    await expect(dslProgress).toBeVisible({ timeout: 5000 })
    
    // Should show different stages
    await expect(dslProgress).toContainText(/analyzing|parsing/i)
    await expect(dslProgress).toContainText(/discovering|finding/i, { timeout: 5000 })
    
    // Step 3: Wait for DSL Result and click "Create Visual Workflow"
    const dslResult = await wsHelper.waitForDSLResult(page)
    await expect(dslResult).toContainText(/praxis-agent-2/i)
    await expect(dslResult).toContainText(/write_file/i)
    
    const createWorkflowButton = dslResult.locator('button:has-text("Create Visual Workflow")')
    await expect(createWorkflowButton).toBeVisible()
    await createWorkflowButton.click()
    
    // Verify workflow appears on canvas
    const canvas = page.locator('[data-testid="workflow-canvas"], .react-flow')
    await expect(canvas).toBeVisible()
    
    // Should have 2-3 nodes
    const nodes = canvas.locator('.react-flow__node')
    await expect(nodes).toHaveCount(2, { timeout: 5000 }) // At least 2 nodes
    
    // Step 4: Execute the workflow
    await uiHelper.executeWorkflow(page)
    
    // Monitor node status changes
    const firstNode = nodes.first()
    const nodeId = await firstNode.getAttribute('data-id') || 'node1'
    
    // Node should go through: idle -> running -> success
    await expect(firstNode).toHaveAttribute('data-status', 'idle')
    await expect(firstNode).toHaveAttribute('data-status', 'running', { timeout: 5000 })
    await expect(firstNode).toHaveAttribute('data-status', 'success', { timeout: 10000 })
    
    // Check logs
    await uiHelper.openLogsPanel(page)
    await uiHelper.checkLogEntry(page, /agent-1/, 'info')
    await uiHelper.checkLogEntry(page, /agent-2/, 'info')
    
    // Wait for completion message in chat
    await wsHelper.waitForWorkflowComplete(page)
    
    // Verify file was created with correct content
    await page.waitForTimeout(2000) // Give filesystem time to sync
    expect(fs.existsSync(testFile)).toBeTruthy()
    const fileContent = fs.readFileSync(testFile, 'utf-8')
    expect(fileContent).toBe('E2E test successful')
  })

  test('E2E-DSL-02: Handling DSL command with non-existent tool', async ({ page }) => {
    // Step 1: Enter DSL command with non-existent tool
    const dslCommand = 'CALL non_existent_tool 123'
    await wsHelper.sendMessage(page, dslCommand)
    
    // Step 2: Wait for DSL Progress
    const dslProgress = page.locator('[data-testid="dsl-progress"], .dsl-progress')
    await expect(dslProgress).toBeVisible({ timeout: 5000 })
    
    // Step 3: Wait for DSL Result with error
    const dslResult = await wsHelper.waitForDSLResult(page)
    await expect(dslResult).toContainText(/error|failed|not found/i)
    await expect(dslResult).toContainText(/non_existent_tool/)
    
    // Verify success is false
    const resultStatus = dslResult.locator('[data-testid="result-status"], .result-status')
    if (await resultStatus.count() > 0) {
      await expect(resultStatus).toHaveText(/false|error|failed/i)
    }
    
    // Step 4: Verify "Create Visual Workflow" button is disabled or absent
    const createWorkflowButton = dslResult.locator('button:has-text("Create Visual Workflow")')
    const buttonCount = await createWorkflowButton.count()
    
    if (buttonCount > 0) {
      await expect(createWorkflowButton).toBeDisabled()
    } else {
      // Button should not exist
      expect(buttonCount).toBe(0)
    }
  })
})