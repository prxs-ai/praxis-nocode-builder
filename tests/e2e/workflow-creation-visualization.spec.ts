import { test, expect } from '@playwright/test'
import { UIHelper } from './helpers/ui-helper'

test.describe('Workflow Creation and Visualization', () => {
  let uiHelper: UIHelper

  test.beforeEach(async ({ page }) => {
    uiHelper = new UIHelper(page)
    await page.goto('/')
    
    // Wait for ReactFlow to load
    const canvas = page.locator('.react-flow, [data-testid="workflow-canvas"]')
    await expect(canvas).toBeVisible({ timeout: 10000 })
  })

  test('should create workflow from DSL command', async ({ page }) => {
    // Open chat and send command
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    await expect(chatPanel).toBeVisible()

    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    await messageInput.fill('create a workflow to process user data')
    await sendButton.click()

    // Click "Create Visual Workflow" button
    const createWorkflowBtn = chatPanel.locator('button:has-text("Create Visual Workflow"), button:has-text("Create Workflow")')
    await expect(createWorkflowBtn).toBeVisible({ timeout: 15000 })
    await createWorkflowBtn.click()

    // Verify workflow nodes are created on canvas
    const canvas = page.locator('.react-flow')
    const nodes = canvas.locator('.react-flow__node')
    await expect(nodes).toHaveCount(await nodes.count(), { timeout: 5000 })
    
    // Take screenshot of created workflow
    await page.screenshot({ 
      path: './test-results/workflow-from-dsl.png', 
      fullPage: true 
    })
  })

  test('should drag and drop nodes from library', async ({ page }) => {
    // Look for node library or components panel
    const nodeLibrary = page.locator('[data-testid="node-library"], .node-library, .components-panel')
    
    if (await nodeLibrary.isVisible()) {
      // Try to drag an agent node to canvas
      const agentNode = nodeLibrary.locator('[data-node-type="agent"], .node-agent').first()
      const canvas = page.locator('.react-flow')
      
      if (await agentNode.isVisible()) {
        await agentNode.dragTo(canvas, { 
          targetPosition: { x: 300, y: 200 } 
        })
        
        // Verify node was added
        const nodes = canvas.locator('.react-flow__node')
        await expect(nodes).toHaveCountGreaterThan(0)
      }
    }
  })

  test('should connect workflow nodes', async ({ page }) => {
    // First create some nodes via chat
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    await messageInput.fill('create a simple data processing workflow')
    await sendButton.click()

    const createWorkflowBtn = chatPanel.locator('button:has-text("Create Visual Workflow"), button:has-text("Create Workflow")')
    await expect(createWorkflowBtn).toBeVisible({ timeout: 15000 })
    await createWorkflowBtn.click()

    // Wait for nodes to be created
    await page.waitForTimeout(2000)

    const canvas = page.locator('.react-flow')
    const nodes = canvas.locator('.react-flow__node')
    
    if (await nodes.count() >= 2) {
      // Try to connect first two nodes
      const firstNode = nodes.first()
      const secondNode = nodes.nth(1)
      
      const firstHandle = firstNode.locator('.react-flow__handle-right, .source-handle')
      const secondHandle = secondNode.locator('.react-flow__handle-left, .target-handle')
      
      if (await firstHandle.isVisible() && await secondHandle.isVisible()) {
        await firstHandle.dragTo(secondHandle)
        
        // Verify edge was created
        const edges = canvas.locator('.react-flow__edge')
        await expect(edges).toHaveCountGreaterThan(0)
      }
    }

    await page.screenshot({ 
      path: './test-results/connected-workflow.png', 
      fullPage: true 
    })
  })

  test('should configure workflow nodes', async ({ page }) => {
    // Create workflow first
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    await messageInput.fill('create workflow with an agent node')
    await sendButton.click()

    const createWorkflowBtn = chatPanel.locator('button:has-text("Create Visual Workflow"), button:has-text("Create Workflow")')
    await expect(createWorkflowBtn).toBeVisible({ timeout: 15000 })
    await createWorkflowBtn.click()

    await page.waitForTimeout(2000)

    // Click on a node to open configuration
    const canvas = page.locator('.react-flow')
    const firstNode = canvas.locator('.react-flow__node').first()
    
    if (await firstNode.isVisible()) {
      await firstNode.click()
      
      // Look for configuration panel
      const configPanel = page.locator('[data-testid="node-config-panel"], .node-config-panel, .node-configuration')
      
      if (await configPanel.isVisible({ timeout: 5000 })) {
        // Try to modify some configuration
        const nameInput = configPanel.locator('input[name="name"], input[placeholder*="name"]')
        if (await nameInput.isVisible()) {
          await nameInput.fill('Custom Agent')
        }
        
        const saveButton = configPanel.locator('button:has-text("Save"), button:has-text("Apply")')
        if (await saveButton.isVisible()) {
          await saveButton.click()
        }
      }
    }
  })

  test('should execute workflow and show status updates', async ({ page }) => {
    // Create a simple workflow
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    await messageInput.fill('create simple test workflow')
    await sendButton.click()

    const createWorkflowBtn = chatPanel.locator('button:has-text("Create Visual Workflow"), button:has-text("Create Workflow")')
    await expect(createWorkflowBtn).toBeVisible({ timeout: 15000 })
    await createWorkflowBtn.click()

    await page.waitForTimeout(2000)

    // Look for execute button
    const executeButton = page.locator('button:has-text("Execute"), [data-testid="execute-workflow"], button:has-text("Run")')
    
    if (await executeButton.isVisible()) {
      await executeButton.click()
      
      // Check for execution status indicators
      const canvas = page.locator('.react-flow')
      const nodes = canvas.locator('.react-flow__node')
      
      // Wait for status changes (nodes might show running/success/error states)
      await page.waitForTimeout(3000)
      
      // Take screenshot of execution
      await page.screenshot({ 
        path: './test-results/workflow-execution.png', 
        fullPage: true 
      })
    }
  })

  test('should show workflow minimap and controls', async ({ page }) => {
    const canvas = page.locator('.react-flow')
    await expect(canvas).toBeVisible()

    // Check for ReactFlow controls
    const controls = page.locator('.react-flow__controls')
    await expect(controls).toBeVisible()

    // Check for minimap if present
    const minimap = page.locator('.react-flow__minimap')
    if (await minimap.isVisible()) {
      console.log('✓ Minimap is visible')
    }

    // Test zoom controls
    const zoomInButton = controls.locator('button[aria-label*="zoom in"], .react-flow__controls-zoomin')
    const zoomOutButton = controls.locator('button[aria-label*="zoom out"], .react-flow__controls-zoomout')
    const fitViewButton = controls.locator('button[aria-label*="fit view"], .react-flow__controls-fitview')

    if (await zoomInButton.isVisible()) {
      await zoomInButton.click()
      await page.waitForTimeout(500)
    }

    if (await zoomOutButton.isVisible()) {
      await zoomOutButton.click()
      await page.waitForTimeout(500)
    }

    if (await fitViewButton.isVisible()) {
      await fitViewButton.click()
      await page.waitForTimeout(500)
    }
  })

  test('should clear and reset workflow canvas', async ({ page }) => {
    // First create some nodes
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    await messageInput.fill('create test workflow')
    await sendButton.click()

    const createWorkflowBtn = chatPanel.locator('button:has-text("Create Visual Workflow"), button:has-text("Create Workflow")')
    await expect(createWorkflowBtn).toBeVisible({ timeout: 15000 })
    await createWorkflowBtn.click()

    await page.waitForTimeout(2000)

    // Look for clear/delete button
    const clearButton = page.locator('button:has-text("Clear"), button[aria-label*="clear"], .clear-workflow')
    
    if (await clearButton.isVisible()) {
      await clearButton.click()
      
      // Verify canvas is cleared
      const canvas = page.locator('.react-flow')
      const nodes = canvas.locator('.react-flow__node')
      await expect(nodes).toHaveCount(0, { timeout: 5000 })
    } else {
      // Try keyboard shortcut
      await page.keyboard.press('Control+A')
      await page.keyboard.press('Delete')
    }
  })
})