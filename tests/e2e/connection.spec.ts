import { test, expect } from '@playwright/test'
import { WebSocketHelper } from './helpers/websocket-helper'
import { UIHelper } from './helpers/ui-helper'

test.describe('E2E-CONN: WebSocket Connection Tests', () => {
  let wsHelper: WebSocketHelper
  let uiHelper: UIHelper

  test.beforeEach(async ({ page }) => {
    wsHelper = new WebSocketHelper(page)
    uiHelper = new UIHelper(page)
    await page.goto('/')
  })

  test('E2E-CONN-01: Successful chat opening and WebSocket connection', async ({ page }) => {
    // Step 1: Open main page (already done in beforeEach)
    await expect(page).toHaveURL('/')
    
    // Step 2: Click on chat icon
    const chatIcon = page.locator('button').filter({ has: page.locator('svg.h-6.w-6') }).first()
    await expect(chatIcon).toBeVisible()
    await chatIcon.click()
    
    // Step 3: Click Connect button in opened chat
    const chatPanel = page.locator('div.fixed.bottom-24.right-6').first()
    await expect(chatPanel).toBeVisible()
    
    const connectButton = page.locator('button:has-text("Connect")').first()
    await expect(connectButton).toBeVisible()
    await connectButton.click()
    
    // Verify connection status changes
    const statusIndicator = page.locator('span').filter({ hasText: /connect/i }).first()
    
    // Should show "Connecting..." initially
    await expect(statusIndicator).toContainText(/Connecting/i, { timeout: 5000 })
    
    // Should change to "Connected"
    await expect(statusIndicator).toContainText(/Connected/i, { timeout: 10000 })
    
    // Should receive welcome message from assistant
    const assistantMessage = chatPanel.locator('.message.assistant, [data-sender="assistant"]').first()
    await expect(assistantMessage).toBeVisible({ timeout: 5000 })
    await expect(assistantMessage).toContainText(/welcome|hello|connected/i)
  })

  test('E2E-CONN-02: Correct disconnect and reconnect', async ({ page }) => {
    // Prerequisites: Complete E2E-CONN-01
    await uiHelper.openChat(page)
    await wsHelper.connect(page)
    
    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel')
    
    // Step 1: Click Disconnect button
    const disconnectButton = chatPanel.locator('button:has-text("Disconnect")')
    await expect(disconnectButton).toBeVisible()
    await disconnectButton.click()
    
    // Verify status changes to "Disconnected"
    const statusIndicator = chatPanel.locator('[data-testid="connection-status"], .connection-status')
    await expect(statusIndicator).toContainText(/Disconnected/i, { timeout: 5000 })
    
    // Step 2: Verify input field is disabled
    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"]')
    await expect(messageInput).toBeDisabled()
    
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    await expect(sendButton).toBeDisabled()
    
    // Step 3: Click Connect again
    const connectButton = chatPanel.locator('button:has-text("Connect")')
    await expect(connectButton).toBeVisible()
    await connectButton.click()
    
    // Verify reconnection
    await expect(statusIndicator).toContainText(/Connected/i, { timeout: 10000 })
    
    // Verify chat is active again
    await expect(messageInput).toBeEnabled()
    await expect(sendButton).toBeEnabled()
  })
})