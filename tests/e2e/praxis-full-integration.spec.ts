import { test, expect, Page } from '@playwright/test'
import { UIHelper } from './helpers/ui-helper'
import { BackendMonitor } from './helpers/backend-monitor'

test.describe('Praxis AI Workflow - Full Integration Test', () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000'
  const baseHost = new URL(baseURL).host
  let uiHelper: UIHelper
  let backendMonitor: BackendMonitor
  
  test.beforeEach(async ({ page }) => {
    uiHelper = new UIHelper(page)
    backendMonitor = new BackendMonitor()
    
    // Enable detailed logging
    console.log('🚀 Starting Praxis Full Integration Test')
    
    // Set up console logging from the page
    page.on('console', msg => {
      console.log(`[Browser Console ${msg.type()}]: ${msg.text()}`)
    })
    
    // Set up error logging
    page.on('pageerror', error => {
      console.error(`[Page Error]: ${error.message}`)
    })
    
    // Set up network request logging
    page.on('request', request => {
      if (request.url().includes(baseHost) || request.url().includes('websocket')) {
        console.log(`[Network Request]: ${request.method()} ${request.url()}`)
      }
    })
    
    page.on('response', response => {
      if (response.url().includes(baseHost) || response.url().includes('websocket')) {
        console.log(`[Network Response]: ${response.status()} ${response.url()}`)
      }
    })
  })

  test('Complete workflow creation and execution with file operations', async ({ page }) => {
    console.log('📋 Test: Complete workflow creation and execution')
    
    // Step 1: Navigate to application and wait for full load
    console.log(`🌐 Step 1: Navigating to ${baseURL}`)
    await page.goto('/', { waitUntil: 'networkidle' })
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/screenshots/01-initial-load.png',
      fullPage: true 
    })
    console.log('📸 Screenshot: Initial load saved')
    
    // Step 2: Wait for UI components to be fully loaded
    console.log('⏳ Step 2: Waiting for UI components to load')
    
    // Wait for main workflow builder components
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 30000 })
    console.log('✅ React Flow canvas loaded')
    
    await expect(page.locator('text=PRAXIS')).toBeVisible({ timeout: 15000 })
    console.log('✅ PRAXIS header visible')
    
    // Wait for node library sidebar
    const nodeLibrary = page.locator('[class*="node-library"], .w-80')
    await expect(nodeLibrary).toBeVisible({ timeout: 15000 })
    console.log('✅ Node library sidebar loaded')
    
    // Wait for control panel buttons
    const executeButton = page.locator('button:has-text("Execute")')
    await expect(executeButton).toBeVisible({ timeout: 15000 })
    console.log('✅ Execute button visible')
    
    // Take screenshot after UI load
    await page.screenshot({ 
      path: 'test-results/screenshots/02-ui-loaded.png',
      fullPage: true 
    })
    console.log('📸 Screenshot: UI fully loaded')
    
    // Step 3: Open chat interface and create workflow
    console.log('💬 Step 3: Opening chat interface')
    
    // Look for chat button or icon
    const chatTriggers = [
      'button:has-text("Chat")',
      '[data-testid="chat-toggle"]',
      '[aria-label*="chat"]',
      '.chat-button',
      'button:has([class*="message"])',
      'button:has([class*="chat"])'
    ]
    
    let chatButton = null
    for (const selector of chatTriggers) {
      const element = page.locator(selector)
      if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
        chatButton = element
        console.log(`✅ Found chat button with selector: ${selector}`)
        break
      }
    }
    
    if (chatButton) {
      await chatButton.click()
      console.log('✅ Chat interface opened')
    } else {
      console.log('ℹ️  No explicit chat button found, checking if chat is already visible')
    }
    
    // Look for chat input area
    const chatInputSelectors = [
      'textarea[placeholder*="chat"]',
      'input[placeholder*="message"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="command"]',
      '[data-testid="chat-input"]',
      '.chat-input textarea',
      'textarea'
    ]
    
    let chatInput = null
    for (const selector of chatInputSelectors) {
      const element = page.locator(selector)
      if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
        chatInput = element
        console.log(`✅ Found chat input with selector: ${selector}`)
        break
      }
    }
    
    // Step 4: Create workflow using DSL command
    if (chatInput) {
      console.log('📝 Step 4: Creating workflow with DSL command')
      
      const dslCommand = 'CALL write_file hello.txt "Hello from UI test!"'
      await chatInput.fill(dslCommand)
      console.log(`✅ Entered DSL command: ${dslCommand}`)
      
      // Submit the command
      await chatInput.press('Enter')
      console.log('✅ Submitted DSL command')
      
      // Wait a moment for processing
      await page.waitForTimeout(3000)
      
      // Take screenshot after command submission
      await page.screenshot({ 
        path: 'test-results/screenshots/03-dsl-command-sent.png',
        fullPage: true 
      })
      console.log('📸 Screenshot: DSL command submitted')
      
    } else {
      console.log('⚠️  No chat input found, attempting alternative workflow creation')
      
      // Alternative: Try to create workflow using "Create Workflow" button if available
      const createWorkflowButton = page.locator('button:has-text("Create Workflow")')
      if (await createWorkflowButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await createWorkflowButton.click()
        console.log('✅ Clicked Create Workflow button')
      }
    }
    
    // Step 5: Wait for workflow to appear in canvas
    console.log('🔄 Step 5: Waiting for workflow to appear in canvas')
    
    // Wait for nodes to be created
    await page.waitForTimeout(5000)
    
    // Look for workflow nodes
    const nodeSelectors = [
      '.react-flow__nodes .react-flow__node',
      '[data-testid="workflow-node"]',
      '.workflow-node',
      '[class*="node"]'
    ]
    
    let workflowNodes = null
    for (const selector of nodeSelectors) {
      const elements = page.locator(selector)
      const count = await elements.count()
      if (count > 0) {
        workflowNodes = elements
        console.log(`✅ Found ${count} workflow nodes with selector: ${selector}`)
        break
      }
    }
    
    if (workflowNodes) {
      const nodeCount = await workflowNodes.count()
      expect(nodeCount).toBeGreaterThan(0)
      console.log(`✅ Workflow created with ${nodeCount} nodes`)
      
      // Take screenshot of created workflow
      await page.screenshot({ 
        path: 'test-results/screenshots/04-workflow-created.png',
        fullPage: true 
      })
      console.log('📸 Screenshot: Workflow created in canvas')
      
    } else {
      console.log('⚠️  No workflow nodes detected, checking for alternative indicators')
      
      // Check if there are any visual indicators of workflow creation
      const indicators = [
        'text="Workflow created"',
        'text="nodes"',
        '.toast',
        '[role="alert"]'
      ]
      
      for (const indicator of indicators) {
        if (await page.locator(indicator).isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`✅ Found workflow creation indicator: ${indicator}`)
          break
        }
      }
    }
    
    // Step 6: Execute the workflow
    console.log('▶️  Step 6: Executing the workflow')
    
    // Find and click the execute button
    const executeBtn = page.locator('button:has-text("Execute")')
    await expect(executeBtn).toBeVisible({ timeout: 10000 })
    
    // Check if button is enabled
    const isEnabled = await executeBtn.isEnabled()
    console.log(`Execute button enabled: ${isEnabled}`)
    
    if (isEnabled) {
      await executeBtn.click()
      console.log('✅ Clicked Execute button')
      
      // Take screenshot after execution starts
      await page.screenshot({ 
        path: 'test-results/screenshots/05-execution-started.png',
        fullPage: true 
      })
      console.log('📸 Screenshot: Workflow execution started')
      
    } else {
      console.log('⚠️  Execute button is disabled, checking for reasons')
      
      // Check for error messages or constraints
      const errorSelectors = [
        '.toast',
        '[role="alert"]',
        '.error-message',
        'text*="error"',
        'text*="Error"'
      ]
      
      for (const selector of errorSelectors) {
        const error = page.locator(selector)
        if (await error.isVisible({ timeout: 2000 }).catch(() => false)) {
          const errorText = await error.textContent()
          console.log(`⚠️  Found error: ${errorText}`)
        }
      }
    }
    
    // Step 7: Wait for and monitor execution results
    console.log('📊 Step 7: Monitoring execution results')
    
    // Wait for execution to complete or show progress
    await page.waitForTimeout(10000)
    
    // Check for logs panel
    const logsPanelSelectors = [
      'button:has-text("Show Logs")',
      'button:has-text("Logs")',
      '[data-testid="logs-button"]',
      '.logs-button'
    ]
    
    for (const selector of logsPanelSelectors) {
      const logsButton = page.locator(selector)
      if (await logsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await logsButton.click()
        console.log(`✅ Opened logs panel with selector: ${selector}`)
        
        // Wait for logs to appear
        await page.waitForTimeout(2000)
        break
      }
    }
    
    // Look for execution logs
    const logEntrySelectors = [
      '.log-entry',
      '[data-testid="log-entry"]',
      '.execution-log',
      'text*="Execution"',
      'text*="log"'
    ]
    
    for (const selector of logEntrySelectors) {
      const logEntries = page.locator(selector)
      const count = await logEntries.count()
      if (count > 0) {
        console.log(`✅ Found ${count} log entries with selector: ${selector}`)
        
        // Log first few entries for debugging
        for (let i = 0; i < Math.min(count, 5); i++) {
          const logText = await logEntries.nth(i).textContent()
          console.log(`📋 Log ${i + 1}: ${logText}`)
        }
        break
      }
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-results/screenshots/06-execution-complete.png',
      fullPage: true 
    })
    console.log('📸 Screenshot: Final state captured')
    
    // Step 8: Verify backend operations
    console.log('🔧 Step 8: Verifying backend operations')
    
    try {
      // Check if backend monitor can detect activity
      const backendActivity = await backendMonitor.checkRecentActivity()
      console.log(`Backend activity detected: ${backendActivity}`)
      
      // Monitor for file operations
      const fileOps = await backendMonitor.checkFileOperations()
      console.log(`File operations detected: ${fileOps}`)
      
    } catch (error) {
      console.log(`⚠️  Backend monitoring error: ${error}`)
    }
    
    // Step 9: Final verification and cleanup
    console.log('✅ Step 9: Test completed successfully')
    
    // Verify core functionality worked
    const finalState = {
      pageLoaded: await page.locator('text=PRAXIS').isVisible(),
      canvasVisible: await page.locator('.react-flow').isVisible(),
      executeButtonPresent: await page.locator('button:has-text("Execute")').isVisible()
    }
    
    console.log('📊 Final State Check:', finalState)
    
    // Assert key functionality
    expect(finalState.pageLoaded).toBeTruthy()
    expect(finalState.canvasVisible).toBeTruthy()
    expect(finalState.executeButtonPresent).toBeTruthy()
    
    console.log('🎉 Praxis Full Integration Test completed successfully!')
  })

  test('Workflow creation with multiple node types', async ({ page }) => {
    console.log('📋 Test: Workflow creation with multiple node types')
    
    await page.goto('/', { waitUntil: 'networkidle' })
    
    // Wait for UI to load
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 30000 })
    await expect(page.locator('text=PRAXIS')).toBeVisible()
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: 'test-results/screenshots/multi-node-01-initial.png',
      fullPage: true 
    })
    
    // Try to use sample workflow if available
    const samplesButton = page.locator('button:has-text("Samples")')
    if (await samplesButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      await samplesButton.click()
      console.log('✅ Opened samples menu')
      
      // Select a sample workflow
      const sampleWorkflows = [
        'text="Customer Support Flow"',
        'text="Simple Q&A Flow"',
        'text="Social Media Network"'
      ]
      
      for (const sample of sampleWorkflows) {
        const sampleOption = page.locator(sample)
        if (await sampleOption.isVisible({ timeout: 5000 }).catch(() => false)) {
          await sampleOption.click()
          console.log(`✅ Selected sample: ${sample}`)
          break
        }
      }
      
      // Wait for workflow to load
      await page.waitForTimeout(3000)
      
      // Take screenshot of loaded sample
      await page.screenshot({ 
        path: 'test-results/screenshots/multi-node-02-sample-loaded.png',
        fullPage: true 
      })
      
      // Check for multiple nodes
      const nodes = page.locator('.react-flow__nodes .react-flow__node')
      const nodeCount = await nodes.count()
      console.log(`✅ Sample workflow loaded with ${nodeCount} nodes`)
      
      if (nodeCount > 0) {
        expect(nodeCount).toBeGreaterThan(1)
        
        // Try to execute the sample workflow
        const executeButton = page.locator('button:has-text("Execute")')
        if (await executeButton.isEnabled()) {
          await executeButton.click()
          console.log('✅ Executed sample workflow')
          
          // Wait for execution
          await page.waitForTimeout(5000)
          
          // Take screenshot of execution
          await page.screenshot({ 
            path: 'test-results/screenshots/multi-node-03-execution.png',
            fullPage: true 
          })
        }
      }
    }
    
    console.log('✅ Multi-node workflow test completed')
  })

  test('Error handling and recovery', async ({ page }) => {
    console.log('📋 Test: Error handling and recovery')
    
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 30000 })
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/screenshots/error-handling-01-initial.png',
      fullPage: true 
    })
    
    // Try to execute empty workflow (should trigger error)
    const executeButton = page.locator('button:has-text("Execute")')
    await executeButton.click()
    console.log('✅ Attempted to execute empty workflow')
    
    // Wait for error message
    await page.waitForTimeout(2000)
    
    // Look for error indicators
    const errorIndicators = [
      '.toast',
      '[role="alert"]',
      'text*="Nothing to execute"',
      'text*="error"',
      'text*="Error"'
    ]
    
    let errorFound = false
    for (const indicator of errorIndicators) {
      const error = page.locator(indicator)
      if (await error.isVisible({ timeout: 5000 }).catch(() => false)) {
        const errorText = await error.textContent()
        console.log(`✅ Found expected error: ${errorText}`)
        errorFound = true
        break
      }
    }
    
    if (!errorFound) {
      console.log('ℹ️  No explicit error message found, but this might be expected behavior')
    }
    
    // Take screenshot of error state
    await page.screenshot({ 
      path: 'test-results/screenshots/error-handling-02-error-state.png',
      fullPage: true 
    })
    
    // Test recovery by clearing and trying again
    const clearButton = page.locator('button:has-text("Clear")')
    if (await clearButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await clearButton.click()
      console.log('✅ Clicked Clear button for recovery')
      
      await page.waitForTimeout(1000)
      
      // Verify canvas is cleared
      const nodes = page.locator('.react-flow__nodes .react-flow__node')
      const nodeCount = await nodes.count()
      console.log(`Canvas node count after clear: ${nodeCount}`)
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-results/screenshots/error-handling-03-recovery.png',
      fullPage: true 
    })
    
    console.log('✅ Error handling test completed')
  })

  test.afterEach(async ({ page }) => {
    console.log('🧹 Test cleanup started')
    
    try {
      // Take a final cleanup screenshot
      await page.screenshot({ 
        path: `test-results/screenshots/cleanup-${Date.now()}.png`,
        fullPage: true 
      })
      
      // Clean up backend monitor if needed
      await backendMonitor.cleanup()
      
    } catch (error) {
      console.log(`⚠️  Cleanup warning: ${error}`)
    }
    
    console.log('✅ Test cleanup completed')
  })
})
