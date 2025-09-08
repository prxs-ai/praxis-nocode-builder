import { test, expect } from '@playwright/test'
const FRONTEND_URL = 'http://localhost:3000'
const BACKEND_URL = 'ws://localhost:8001/ws/workflow'
test.describe('Praxis Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL)
    await page.waitForLoadState('networkidle')
  })
  test('should display chat toggle button', async ({ page }) => {
    const chatToggle = page.locator('button').filter({ hasText: /.*/ }).first()
    await expect(chatToggle).toBeVisible()
    const boundingBox = await chatToggle.boundingBox()
    expect(boundingBox).toBeTruthy()
    if (boundingBox) {
      const viewportSize = page.viewportSize()
      if (viewportSize) {
        expect(boundingBox.x).toBeGreaterThan(viewportSize.width * 0.8) // Right side
        expect(boundingBox.y).toBeGreaterThan(viewportSize.height * 0.8) // Bottom
      }
    }
  })
  test('should open and close chat window', async ({ page }) => {
    await page.click('button[class*="fixed bottom-6 right-6"]')
    const chatWindow = page.locator('.fixed.bottom-24.right-6')
    await expect(chatWindow).toBeVisible()
    await expect(page.locator('text=Workflow Assistant')).toBeVisible()
    await page.click('button:has-text("×"), [aria-label="Close"]')
    await expect(chatWindow).not.toBeVisible()
  })
  test('should show connection controls when disconnected', async ({ page }) => {
    await page.click('button[class*="fixed bottom-6 right-6"]')
    const connectButton = page.locator('button:has-text("Connect to Assistant")')
    await expect(connectButton).toBeVisible()
    const disconnectedBadge = page.locator('text=Disconnected')
    await expect(disconnectedBadge).toBeVisible()
  })
  test('should connect to WebSocket backend', async ({ page }) => {
    await page.click('button[class*="fixed bottom-6 right-6"]')
    await page.click('button:has-text("Connect to Assistant")')
    await page.waitForTimeout(2000)
    const connectedBadge = page.locator('text=Connected')
    await expect(connectedBadge).toBeVisible()
    const disconnectButton = page.locator('button:has-text("Disconnect")')
    await expect(disconnectButton).toBeVisible()
    await expect(page.locator('text*=Connected to Praxis workflow assistant')).toBeVisible()
  })
  test('should have input field inside chat window', async ({ page }) => {
    await page.click('button[class*="fixed bottom-6 right-6"]')
    await page.click('button:has-text("Connect to Assistant")')
    await page.waitForTimeout(2000)
    const chatWindow = page.locator('.fixed.bottom-24.right-6')
    const inputField = chatWindow.locator('input[placeholder*="Type a message"]')
    await expect(inputField).toBeVisible()
    const inputContainer = inputField.locator('..')
    await expect(inputContainer).toHaveClass(/border-t/)
    const sendButton = chatWindow.locator('button:has([data-testid="send-icon"], svg)')
    await expect(sendButton).toBeVisible()
  })
  test('should send and receive regular chat messages', async ({ page }) => {
    await page.click('button[class*="fixed bottom-6 right-6"]')
    await page.click('button:has-text("Connect to Assistant")')
    await page.waitForTimeout(2000)
    const inputField = page.locator('input[placeholder*="Type a message"]')
    await inputField.fill('Hello, how are you?')
    await page.click('button:has(svg)')
    await expect(page.locator('text=Hello, how are you?')).toBeVisible()
    await page.waitForTimeout(3000)
    const assistantMessages = page.locator('.mr-auto.bg-white')
    await expect(assistantMessages).toHaveCount({ min: 1 })
    await expect(page.locator('text=Echo: Hello, how are you?')).not.toBeVisible()
  })
  test('should detect and process DSL commands', async ({ page }) => {
    await page.click('button[class*="fixed bottom-6 right-6"]')
    await page.click('button:has-text("Connect to Assistant")')
    await page.waitForTimeout(2000)
    const inputField = page.locator('input[placeholder*="Type a message"]')
    await inputField.fill('agent')
    await page.click('button:has(svg)')
    const userMessage = page.locator('.ml-auto').filter({ hasText: 'agent' })
    await expect(userMessage).toBeVisible()
    await expect(userMessage).toHaveClass(/purple-500|blue-500/)
    await expect(page.locator('text*=Processing DSL command')).toBeVisible()
    await page.waitForTimeout(8000)
    await expect(page.locator('text*=DSL analysis')).toBeVisible()
    await expect(page.locator('text=Echo: agent')).not.toBeVisible()
  })
  test('should handle workflow creation DSL commands', async ({ page }) => {
    await page.click('button[class*="fixed bottom-6 right-6"]')
    await page.click('button:has-text("Connect to Assistant")')
    await page.waitForTimeout(2000)
    const inputField = page.locator('input[placeholder*="Type a message"]')
    await inputField.fill('create workflow for data analysis')
    await page.click('button:has(svg)')
    const userMessage = page.locator('.ml-auto').filter({ hasText: 'create workflow for data analysis' })
    await expect(userMessage).toHaveClass(/purple-500|blue-500/)
    await expect(page.locator('text*=Processing DSL command')).toBeVisible()
    await page.waitForTimeout(10000)
    await expect(page.locator('text*=analysis')).toBeVisible()
  })
  test('should handle multiple DSL keywords', async ({ page }) => {
    await page.click('button[class*="fixed bottom-6 right-6"]')
    await page.click('button:has-text("Connect to Assistant")')
    await page.waitForTimeout(2000)
    const dslCommands = [
      'workflow',
      'agent calculate sum', 
      'build flow',
      'process data',
      'execute task'
    ]
    for (const command of dslCommands) {
      const inputField = page.locator('input[placeholder*="Type a message"]')
      await inputField.fill(command)
      await page.click('button:has(svg)')
      const userMessage = page.locator('.ml-auto').filter({ hasText: command })
      await expect(userMessage).toHaveClass(/purple-500|blue-500/)
      await page.waitForTimeout(1000)
    }
  })
  test('should show timestamps for messages', async ({ page }) => {
    await page.click('button[class*="fixed bottom-6 right-6"]')
    await page.click('button:has-text("Connect to Assistant")')
    await page.waitForTimeout(2000)
    const inputField = page.locator('input[placeholder*="Type a message"]')
    await inputField.fill('test message')
    await page.click('button:has(svg)')
    const timestampRegex = /\d{2}:\d{2}/
    await expect(page.locator(`text=${timestampRegex}`)).toBeVisible()
  })
  test('should handle connection errors gracefully', async ({ page }) => {
    await page.click('button[class*="fixed bottom-6 right-6"]')
    await page.route('**/ws/workflow', route => {
      route.abort()
    })
    await page.click('button:has-text("Connect to Assistant")')
    await page.waitForTimeout(2000)
    await expect(page.locator('text*=Error')).toBeVisible()
  })
  test('should minimize and maximize chat window', async ({ page }) => {
    await page.click('button[class*="fixed bottom-6 right-6"]')
    const minimizeButton = page.locator('button:has([data-testid="minimize-icon"], svg)').first()
    await minimizeButton.click()
    const chatWindow = page.locator('.fixed.bottom-24.right-6')
    await expect(chatWindow).toHaveClass(/h-16/)
    const maximizeButton = page.locator('button:has([data-testid="maximize-icon"], svg)').first()
    await maximizeButton.click()
    await expect(chatWindow).toHaveClass(/h-96/)
  })
  test('should auto-scroll to bottom when new messages arrive', async ({ page }) => {
    await page.click('button[class*="fixed bottom-6 right-6"]')
    await page.click('button:has-text("Connect to Assistant")')
    await page.waitForTimeout(2000)
    const inputField = page.locator('input[placeholder*="Type a message"]')
    for (let i = 0; i < 5; i++) {
      await inputField.fill(`Message ${i + 1}`)
      await page.click('button:has(svg)')
      await page.waitForTimeout(500)
    }
    await expect(page.locator('text=Message 5')).toBeVisible()
  })
})
test.describe('Praxis Workflow Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL)
    await page.waitForLoadState('networkidle')
    await page.click('button[class*="fixed bottom-6 right-6"]')
    await page.click('button:has-text("Connect to Assistant")')
    await page.waitForTimeout(2000)
  })
  test('should integrate with workflow builder', async ({ page }) => {
    const inputField = page.locator('input[placeholder*="Type a message"]')
    await inputField.fill('create workflow: analyze data and generate report')
    await page.click('button:has(svg)')
    await page.waitForTimeout(10000)
    await expect(page.locator('text*=analysis')).toBeVisible()
  })
  test('should handle agent discovery and matching', async ({ page }) => {
    const inputField = page.locator('input[placeholder*="Type a message"]')
    await inputField.fill('find agents with calculation capabilities')
    await page.click('button:has(svg)')
    await page.waitForTimeout(8000)
    await expect(page.locator('text*=agent')).toBeVisible()
  })
})