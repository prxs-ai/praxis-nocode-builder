import { Page, expect } from '@playwright/test'

export class WebSocketHelper {
  constructor(private page: Page) {}

  async connect(page: Page) {
    // Check if WebSocket is already connected
    const wsStatus = await page.evaluate(() => {
      return {
        hasWebSocket: 'WebSocket' in window,
        connectionCount: (window as any).wsConnections?.length || 0,
        states: ((window as any).wsConnections || []).map((ws: WebSocket) => ws.readyState)
      }
    })

    if (wsStatus.connectionCount > 0 && wsStatus.states.includes(1)) {
      console.log('WebSocket already connected')
      return
    }

    // Try to find and click connect button
    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel')
    const connectButton = chatPanel.locator('button:has-text("Connect")')
    
    if (await connectButton.isVisible()) {
      await connectButton.click()
      
      // Wait for connection to establish
      const statusIndicator = chatPanel.locator('[data-testid="connection-status"], .connection-status')
      await expect(statusIndicator).toContainText(/Connected/i, { timeout: 10000 })
    } else {
      // WebSocket might auto-connect, wait and verify
      await page.waitForTimeout(2000)
      const finalStatus = await page.evaluate(() => {
        return ((window as any).wsConnections || []).map((ws: WebSocket) => ws.readyState)
      })
      
      if (finalStatus.includes(1)) {
        console.log('WebSocket auto-connected')
      }
    }
  }

  async disconnect(page: Page) {
    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel')
    const disconnectButton = chatPanel.locator('button:has-text("Disconnect")')
    
    if (await disconnectButton.isVisible()) {
      await disconnectButton.click()
      
      // Wait for disconnection
      const statusIndicator = chatPanel.locator('[data-testid="connection-status"], .connection-status')
      await expect(statusIndicator).toContainText(/Disconnected/i, { timeout: 5000 })
    }
  }

  async waitForMessage(page: Page, messageType: 'user' | 'assistant', content: string | RegExp, timeout = 10000) {
    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel')
    const messageSelector = messageType === 'user' 
      ? '.message.user, [data-sender="user"]'
      : '.message.assistant, [data-sender="assistant"]'
    
    const message = chatPanel.locator(messageSelector).filter({ hasText: content })
    await expect(message).toBeVisible({ timeout })
    return message
  }

  async sendMessage(page: Page, message: string) {
    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel')
    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    await messageInput.fill(message)
    await sendButton.click()
    
    // Wait for message to appear in chat
    await this.waitForMessage(page, 'user', message)
  }

  async waitForDSLResult(page: Page, timeout = 15000) {
    const dslResult = page.locator('[data-testid="dsl-result"], .dsl-result')
    await expect(dslResult).toBeVisible({ timeout })
    return dslResult
  }

  async waitForWorkflowComplete(page: Page, timeout = 30000) {
    // Wait for completion message in chat
    const completionMessage = await this.waitForMessage(
      page, 
      'assistant', 
      /workflow.*complet|execution.*success|✅/i,
      timeout
    )
    return completionMessage
  }

  async getConnectionStatus(page: Page): Promise<string> {
    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel')
    const statusIndicator = chatPanel.locator('[data-testid="connection-status"], .connection-status')
    const statusText = await statusIndicator.textContent()
    return statusText || ''
  }
}