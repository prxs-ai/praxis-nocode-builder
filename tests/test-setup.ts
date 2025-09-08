import { test as base, expect } from '@playwright/test'
import { UIHelper } from './e2e/helpers/ui-helper'
import { WebSocketHelper } from './e2e/helpers/websocket-helper'
import * as fs from 'fs'
import * as path from 'path'

// Extend base test with custom fixtures
export const test = base.extend<{
  uiHelper: UIHelper
  wsHelper: WebSocketHelper
  testDataDir: string
}>({
  uiHelper: async ({ page }, use) => {
    const uiHelper = new UIHelper(page)
    await use(uiHelper)
  },

  wsHelper: async ({ page }, use) => {
    const wsHelper = new WebSocketHelper(page)
    await use(wsHelper)
  },

  testDataDir: async ({}, use) => {
    const testDataDir = path.join(__dirname, 'test-data')
    
    // Create test data directory if it doesn't exist
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true })
    }
    
    await use(testDataDir)
    
    // Cleanup test data after test
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true })
    }
  }
})

// Global test configuration
test.beforeEach(async ({ page }) => {
  // Set up console logging
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warn') {
      console.log(`Browser ${msg.type()}: ${msg.text()}`)
    }
  })

  // Set up page error handling
  page.on('pageerror', error => {
    console.log('Page Error:', error.message)
  })

  // Set up network failure handling
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`Network Error: ${response.status()} ${response.url()}`)
    }
  })

  // Navigate to application
  await page.goto('/')
  
  // Wait for main application to load
  const mainContent = page.locator('.react-flow, [data-testid="workflow-canvas"], main')
  await expect(mainContent).toBeVisible({ timeout: 15000 })
})

export { expect }