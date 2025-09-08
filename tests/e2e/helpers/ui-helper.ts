import { Page, expect } from '@playwright/test'

export class UIHelper {
  constructor(private page: Page) {}

  async openChat(page: Page) {
    const chatIcon = page.locator('[data-testid="chat-icon"], button:has-text("Chat")')
    if (await chatIcon.isVisible()) {
      await chatIcon.click()
      const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel')
      await expect(chatPanel).toBeVisible()
    }
  }

  async closeChat(page: Page) {
    const closeButton = page.locator('[data-testid="chat-close"], button[aria-label="Close"]')
    if (await closeButton.isVisible()) {
      await closeButton.click()
      const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel')
      await expect(chatPanel).not.toBeVisible()
    }
  }

  async openLogsPanel(page: Page) {
    const logsButton = page.locator('button:has-text("Logs"), [data-testid="logs-button"]')
    if (await logsButton.isVisible()) {
      await logsButton.click()
      const logsPanel = page.locator('[data-testid="logs-panel"], .logs-panel')
      await expect(logsPanel).toBeVisible()
    }
  }

  async dragNodeToCanvas(page: Page, nodeType: string, position: { x: number, y: number }) {
    const nodeLibrary = page.locator('[data-testid="node-library"], .node-library')
    const nodeElement = nodeLibrary.locator(`[data-node-type="${nodeType}"], .node-${nodeType}`)
    const canvas = page.locator('[data-testid="workflow-canvas"], .react-flow')
    
    await nodeElement.dragTo(canvas, {
      targetPosition: position
    })
  }

  async connectNodes(page: Page, sourceNodeId: string, targetNodeId: string) {
    const sourceHandle = page.locator(`[data-nodeid="${sourceNodeId}"] .source-handle, #${sourceNodeId} .react-flow__handle-right`)
    const targetHandle = page.locator(`[data-nodeid="${targetNodeId}"] .target-handle, #${targetNodeId} .react-flow__handle-left`)
    
    await sourceHandle.dragTo(targetHandle)
  }

  async configureNode(page: Page, nodeId: string, config: Record<string, any>) {
    const node = page.locator(`[data-nodeid="${nodeId}"], #${nodeId}`)
    await node.click()
    
    const configPanel = page.locator('[data-testid="node-config-panel"], .node-config-panel')
    await expect(configPanel).toBeVisible()
    
    for (const [key, value] of Object.entries(config)) {
      const input = configPanel.locator(`input[name="${key}"], select[name="${key}"], textarea[name="${key}"]`)
      if (await input.isVisible()) {
        await input.fill(String(value))
      }
    }
    
    // Save configuration
    const saveButton = configPanel.locator('button:has-text("Save"), button:has-text("Apply")')
    if (await saveButton.isVisible()) {
      await saveButton.click()
    }
  }

  async executeWorkflow(page: Page) {
    const executeButton = page.locator('button:has-text("Execute"), [data-testid="execute-workflow"]')
    await expect(executeButton).toBeVisible()
    await executeButton.click()
  }

  async waitForNodeStatus(page: Page, nodeId: string, status: 'idle' | 'running' | 'success' | 'error', timeout = 15000) {
    const node = page.locator(`[data-nodeid="${nodeId}"], #${nodeId}`)
    await expect(node).toHaveAttribute('data-status', status, { timeout })
  }

  async getNodeStatus(page: Page, nodeId: string): Promise<string> {
    const node = page.locator(`[data-nodeid="${nodeId}"], #${nodeId}`)
    const status = await node.getAttribute('data-status')
    return status || 'unknown'
  }

  async checkLogEntry(page: Page, content: string | RegExp, level?: 'info' | 'debug' | 'error' | 'warn') {
    const logsPanel = page.locator('[data-testid="logs-panel"], .logs-panel')
    let logEntry = logsPanel.locator('.log-entry, [data-testid="log-entry"]')
    
    if (level) {
      logEntry = logEntry.filter({ has: page.locator(`[data-level="${level}"]`) })
    }
    
    logEntry = logEntry.filter({ hasText: content })
    await expect(logEntry).toBeVisible()
    return logEntry
  }

  async clickLogNodeId(page: Page, nodeId: string) {
    const logsPanel = page.locator('[data-testid="logs-panel"], .logs-panel')
    const nodeIdLink = logsPanel.locator(`[data-node-id="${nodeId}"], a:has-text("${nodeId}")`)
    await nodeIdLink.click()
  }

  async isNodeHighlighted(page: Page, nodeId: string): Promise<boolean> {
    const node = page.locator(`[data-nodeid="${nodeId}"], #${nodeId}`)
    const isHighlighted = await node.evaluate((el) => {
      const classList = el.classList
      return classList.contains('highlighted') || classList.contains('selected') || classList.contains('focused')
    })
    return isHighlighted
  }

  async clearCanvas(page: Page) {
    // Select all nodes
    await page.keyboard.press('Control+A')
    // Delete selected
    await page.keyboard.press('Delete')
  }
}