import { test, expect } from '@playwright/test'
import { UIHelper } from './helpers/ui-helper'

test.describe('DSL Command Input and Analysis', () => {
  let uiHelper: UIHelper

  test.beforeEach(async ({ page }) => {
    uiHelper = new UIHelper(page)
    await page.goto('/')
  })

  test('should handle basic file creation DSL command', async ({ page }) => {
    // Open chat interface
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await expect(chatButton).toBeVisible()
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    await expect(chatPanel).toBeVisible()

    // Send DSL command
    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    await messageInput.fill('create file config.json with {"port": 3000}')
    await sendButton.click()

    // Verify AI processing indicator
    const processingIndicator = chatPanel.locator(':has-text("Understanding"), :has-text("Processing"), .loading')
    await expect(processingIndicator).toBeVisible({ timeout: 5000 })

    // Check for workflow creation suggestion
    await expect(chatPanel.locator('button:has-text("Create Visual Workflow"), button:has-text("Create Workflow")')).toBeVisible({ timeout: 15000 })
    
    // Take screenshot
    await page.screenshot({ 
      path: './test-results/dsl-file-creation.png', 
      fullPage: true 
    })
  })

  test('should analyze complex multi-step DSL commands', async ({ page }) => {
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    await expect(chatPanel).toBeVisible()

    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    // Send complex multi-step command
    const complexCommand = `
      1. Read data from input.csv
      2. Filter records where status = 'active'  
      3. Transform data using mapping rules
      4. Save results to output.json
      5. Send notification email
    `
    
    await messageInput.fill(complexCommand)
    await sendButton.click()

    // Wait for AI analysis
    await page.waitForTimeout(3000)

    // Check that multiple workflow steps are identified
    const messages = chatPanel.locator('.message, [data-testid*="message"]')
    const messageTexts = await messages.allTextContents()
    
    // Verify that the system identifies multiple steps
    const hasMultipleSteps = messageTexts.some(text => 
      text.includes('steps') || text.includes('workflow') || text.includes('process')
    )
    expect(hasMultipleSteps).toBeTruthy()
  })

  test('should handle error scenarios in DSL parsing', async ({ page }) => {
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    await expect(chatPanel).toBeVisible()

    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    // Send invalid/ambiguous command
    await messageInput.fill('do something with the thing')
    await sendButton.click()

    await page.waitForTimeout(3000)

    // Check for clarification request or error handling
    const messages = chatPanel.locator('.message, [data-testid*="message"]')
    const messageTexts = await messages.allTextContents()
    
    const hasErrorHandling = messageTexts.some(text => 
      text.includes('clarify') || 
      text.includes('specific') || 
      text.includes('more information') ||
      text.includes('help')
    )
    expect(hasErrorHandling).toBeTruthy()
  })

  test('should parse natural language commands correctly', async ({ page }) => {
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    await expect(chatPanel).toBeVisible()

    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    // Natural language command
    await messageInput.fill('I need to backup all my documents and compress them into a zip file')
    await sendButton.click()

    await page.waitForTimeout(3000)

    // Verify the system understands the intent
    const createWorkflowBtn = chatPanel.locator('button:has-text("Create Visual Workflow"), button:has-text("Create Workflow")')
    await expect(createWorkflowBtn).toBeVisible({ timeout: 10000 })
  })

  test('should show DSL command history', async ({ page }) => {
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    await expect(chatPanel).toBeVisible()

    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    // Send first command
    await messageInput.fill('create file test1.txt')
    await sendButton.click()
    await page.waitForTimeout(2000)

    // Send second command
    await messageInput.fill('delete file test1.txt')
    await sendButton.click()
    await page.waitForTimeout(2000)

    // Check that both commands appear in chat history
    const messages = chatPanel.locator('.message, [data-testid*="message"]')
    const userMessages = messages.filter({ hasText: /create file|delete file/ })
    await expect(userMessages).toHaveCount(2, { timeout: 10000 })
  })
})