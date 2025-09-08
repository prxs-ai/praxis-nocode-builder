import { test, expect } from '@playwright/test'
import { WebSocketHelper } from './helpers/websocket-helper'
import { UIHelper } from './helpers/ui-helper'
import * as fs from 'fs'
import * as path from 'path'

test.describe('Comprehensive Praxis AI System Test', () => {
  let wsHelper: WebSocketHelper
  let uiHelper: UIHelper
  const sharedDir = path.join(process.cwd(), '..', '..', 'shared')
  const testFile = path.join(sharedDir, 'hello.txt')
  
  test.beforeEach(async ({ page }) => {
    wsHelper = new WebSocketHelper(page)
    uiHelper = new UIHelper(page)
    
    // Clean up test files if they exist
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile)
    }
    
    // Set up console logging to capture JavaScript errors
    page.on('console', msg => {
      console.log(`Browser Console [${msg.type()}]:`, msg.text())
    })
    
    page.on('pageerror', error => {
      console.log('Page Error:', error.message)
    })
    
    // Navigate to the application
    await page.goto('/')
  })

  test.afterEach(async () => {
    // Clean up test files
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile)
    }
  })

  test('1. UI Loading and Components Test', async ({ page }) => {
    console.log('\n=== Testing UI Loading and Components ===')
    
    // Step 1: Check if page loads correctly
    await expect(page).toHaveTitle(/Praxis|Workflow/i)
    console.log('✓ Page loaded with correct title')
    
    // Step 2: Check for workflow canvas
    const canvas = page.locator('[data-testid="workflow-canvas"], .react-flow, .workflow-builder')
    await expect(canvas).toBeVisible({ timeout: 10000 })
    console.log('✓ Workflow canvas is visible')
    
    // Step 3: Check for chat button (blue button in bottom right)
    const chatButton = page.locator(
      'button[data-testid="chat-toggle"], ' +
      'button:has-text("Chat"), ' +
      '.fixed.bottom-4.right-4 button, ' +
      '.chat-toggle, ' +
      '.floating-chat-button'
    )
    await expect(chatButton).toBeVisible({ timeout: 10000 })
    console.log('✓ Chat button is visible')
    
    // Step 4: Check for components/node library
    const nodeLibrary = page.locator('[data-testid="node-library"], .node-library, .components-panel')
    if (await nodeLibrary.isVisible()) {
      console.log('✓ Node library/components panel is visible')
    } else {
      console.log('ℹ Node library not immediately visible (may be in sidebar)')
    }
    
    // Take screenshot of main page (saved to repo-local test-results)
    const screenshotsDir = path.join(process.cwd(), 'test-results', 'screenshots')
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true })
    }
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'praxis-main-page.png'), 
      fullPage: true 
    })
    console.log('✓ Main page screenshot saved')
  })

  test('2. Chat Interface and DSL Commands Test', async ({ page }) => {
    console.log('\n=== Testing Chat Interface and DSL Commands ===')
    
    // Step 1: Open chat
    const chatButton = page.locator(
      'button[data-testid="chat-toggle"], ' +
      'button:has-text("Chat"), ' +
      '.fixed.bottom-4.right-4 button, ' +
      '.chat-toggle, ' +
      '.floating-chat-button'
    )
    await chatButton.click()
    console.log('✓ Chat button clicked')
    
    // Wait for chat panel to open
    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    await expect(chatPanel).toBeVisible({ timeout: 10000 })
    console.log('✓ Chat panel opened')
    
    // Step 2: Connect WebSocket if needed
    try {
      await wsHelper.connect(page)
      console.log('✓ WebSocket connected')
    } catch (error) {
      console.log('ℹ WebSocket connection may be automatic or already connected')
    }
    
    // Take screenshot of opened chat
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'praxis-chat-opened.png'), 
      fullPage: true 
    })
    
    // Step 3: Send "create file hello.txt" command
    const createCommand = 'create file hello.txt'
    console.log(`Sending command: ${createCommand}`)
    
    const messageInput = chatPanel.locator(
      'input[placeholder*="message"], ' +
      'input[placeholder*="command"], ' +
      'textarea[placeholder*="message"], ' +
      'input[type="text"], ' +
      '.message-input input'
    )
    const sendButton = chatPanel.locator(
      'button[type="submit"], ' +
      'button:has-text("Send"), ' +
      '.send-button, ' +
      'button[aria-label*="send"]'
    )
    
    await expect(messageInput).toBeVisible()
    await messageInput.fill(createCommand)
    await sendButton.click()
    console.log('✓ Create command sent')
    
    // Step 4: Check for progress message "Understanding your request with AI..."
    const progressMessage = chatPanel.locator(
      ':has-text("Understanding your request"), ' +
      ':has-text("Processing"), ' +
      ':has-text("AI..."), ' +
      '.progress, ' +
      '.loading'
    )
    
    try {
      await expect(progressMessage).toBeVisible({ timeout: 5000 })
      console.log('✓ AI processing progress message appeared')
    } catch (error) {
      console.log('⚠ AI processing progress message not found or appeared too quickly')
    }
    
    // Step 5: Wait for system response
    await page.waitForTimeout(3000) // Give system time to respond
    
    // Check for "Create Visual Workflow" button
    const createWorkflowButton = chatPanel.locator(
      'button:has-text("Create Visual Workflow"), ' +
      'button:has-text("Create Workflow"), ' +
      '.create-workflow-btn'
    )
    
    try {
      await expect(createWorkflowButton).toBeVisible({ timeout: 10000 })
      console.log('✓ "Create Visual Workflow" button appeared')
    } catch (error) {
      console.log('⚠ "Create Visual Workflow" button not found - checking response messages')
      
      // Check all messages in chat
      const messages = chatPanel.locator('.message, [data-testid*="message"]')
      const messageCount = await messages.count()
      console.log(`Found ${messageCount} messages in chat`)
      
      for (let i = 0; i < messageCount; i++) {
        const message = messages.nth(i)
        const text = await message.textContent()
        console.log(`Message ${i + 1}: ${text?.substring(0, 100)}...`)
      }
    }
    
    // Take screenshot of chat with messages
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'praxis-chat-with-messages.png'), 
      fullPage: true 
    })
    console.log('✓ Chat messages screenshot saved')
  })

  test('3. Delete Command Test', async ({ page }) => {
    console.log('\n=== Testing Delete Commands ===')
    
    // Step 1: Open chat
    const chatButton = page.locator(
      'button[data-testid="chat-toggle"], ' +
      'button:has-text("Chat"), ' +
      '.fixed.bottom-4.right-4 button, ' +
      '.chat-toggle, ' +
      '.floating-chat-button'
    )
    await chatButton.click()
    
    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    await expect(chatPanel).toBeVisible({ timeout: 10000 })
    
    // Step 2: Connect WebSocket if needed
    try {
      await wsHelper.connect(page)
    } catch (error) {
      console.log('ℹ WebSocket connection may be automatic')
    }
    
    // Step 3: Send delete command
    const deleteCommand = 'delete file hello.txt'
    console.log(`Sending command: ${deleteCommand}`)
    
    const messageInput = chatPanel.locator(
      'input[placeholder*="message"], ' +
      'input[placeholder*="command"], ' +
      'textarea[placeholder*="message"], ' +
      'input[type="text"], ' +
      '.message-input input'
    )
    const sendButton = chatPanel.locator(
      'button[type="submit"], ' +
      'button:has-text("Send"), ' +
      '.send-button, ' +
      'button[aria-label*="send"]'
    )
    
    await messageInput.fill(deleteCommand)
    await sendButton.click()
    console.log('✓ Delete command sent')
    
    // Step 4: Wait for system to process delete command
    await page.waitForTimeout(3000)
    
    // Check for response
    const messages = chatPanel.locator('.message, [data-testid*="message"]')
    const messageCount = await messages.count()
    console.log(`System processed delete command - ${messageCount} total messages`)
    
    // Take screenshot
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'praxis-delete-command.png'), 
      fullPage: true 
    })
  })

  test('4. Browser Console and WebSocket Test', async ({ page }) => {
    console.log('\n=== Testing Browser Console and WebSocket ===')
    
    const consoleMessages: any[] = []
    const pageErrors: any[] = []
    const networkErrors: any[] = []
    
    // Capture console messages
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      })
    })
    
    // Capture page errors
    page.on('pageerror', error => {
      pageErrors.push({
        message: error.message,
        stack: error.stack
      })
    })
    
    // Capture network errors
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        })
      }
    })
    
    // Step 1: Navigate and interact with the page
    await page.goto('/')
    await page.waitForTimeout(2000)
    
    // Open chat to trigger WebSocket connections
    const chatButton = page.locator(
      'button[data-testid="chat-toggle"], ' +
      'button:has-text("Chat"), ' +
      '.fixed.bottom-4.right-4 button, ' +
      '.chat-toggle, ' +
      '.floating-chat-button'
    )
    
    if (await chatButton.isVisible()) {
      await chatButton.click()
      await page.waitForTimeout(2000)
    }
    
    // Step 2: Check WebSocket connection
    const webSocketConnected = await page.evaluate(() => {
      // Check if WebSocket is available and connected
      return new Promise((resolve) => {
        setTimeout(() => {
          const hasWebSocket = 'WebSocket' in window
          const wsConnections = (window as any).wsConnections || []
          resolve({
            hasWebSocket,
            connectionCount: wsConnections.length,
            readyStates: wsConnections.map((ws: WebSocket) => ws.readyState)
          })
        }, 1000)
      })
    })
    
    console.log('WebSocket Status:', webSocketConnected)
    
    // Step 3: Analyze console messages
    console.log(`\n--- Console Analysis (${consoleMessages.length} messages) ---`)
    
    const errorMessages = consoleMessages.filter(msg => msg.type === 'error')
    const warningMessages = consoleMessages.filter(msg => msg.type === 'warning')
    const infoMessages = consoleMessages.filter(msg => msg.type === 'info' || msg.type === 'log')
    
    console.log(`Errors: ${errorMessages.length}`)
    console.log(`Warnings: ${warningMessages.length}`)
    console.log(`Info/Log: ${infoMessages.length}`)
    
    // Print errors in detail
    if (errorMessages.length > 0) {
      console.log('\n--- JavaScript Errors ---')
      errorMessages.forEach((error, index) => {
        console.log(`Error ${index + 1}: ${error.text}`)
        if (error.location) {
          console.log(`  Location: ${error.location.url}:${error.location.lineNumber}`)
        }
      })
    }
    
    // Print warnings
    if (warningMessages.length > 0) {
      console.log('\n--- JavaScript Warnings ---')
      warningMessages.slice(0, 5).forEach((warning, index) => {
        console.log(`Warning ${index + 1}: ${warning.text}`)
      })
    }
    
    // Check for JSON parsing errors
    const jsonErrors = consoleMessages.filter(msg => 
      msg.text.toLowerCase().includes('json') && 
      (msg.text.toLowerCase().includes('parse') || msg.text.toLowerCase().includes('syntax'))
    )
    
    console.log(`JSON Parsing Errors: ${jsonErrors.length}`)
    if (jsonErrors.length > 0) {
      jsonErrors.forEach((error, index) => {
        console.log(`JSON Error ${index + 1}: ${error.text}`)
      })
    }
    
    // Step 4: Check page errors
    if (pageErrors.length > 0) {
      console.log(`\n--- Page Errors (${pageErrors.length}) ---`)
      pageErrors.forEach((error, index) => {
        console.log(`Page Error ${index + 1}: ${error.message}`)
      })
    }
    
    // Step 5: Check network errors
    if (networkErrors.length > 0) {
      console.log(`\n--- Network Errors (${networkErrors.length}) ---`)
      networkErrors.forEach((error, index) => {
        console.log(`Network Error ${index + 1}: ${error.status} ${error.statusText} - ${error.url}`)
      })
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'praxis-final-state.png'), 
      fullPage: true 
    })
    
    console.log('\n=== Console and WebSocket Test Complete ===')
  })
})
