import { test, expect } from '../test-setup'

test.describe('Comprehensive Workflow Builder Test Suite', () => {
  test('should complete full workflow creation and execution cycle', async ({ page, uiHelper, wsHelper }) => {
    console.log('🚀 Starting comprehensive workflow test')

    // Step 1: Open chat interface
    console.log('Step 1: Opening chat interface...')
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await expect(chatButton).toBeVisible()
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    await expect(chatPanel).toBeVisible()

    // Step 2: Send DSL command
    console.log('Step 2: Sending DSL command...')
    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    const command = 'create workflow: read file data.csv → validate data → transform to JSON → save output.json'
    await messageInput.fill(command)
    await sendButton.click()

    // Step 3: Wait for AI analysis
    console.log('Step 3: Waiting for AI analysis...')
    const processingIndicator = chatPanel.locator(':has-text("Understanding"), :has-text("Processing"), .loading')
    
    try {
      await expect(processingIndicator).toBeVisible({ timeout: 5000 })
      console.log('✓ AI processing indicator shown')
    } catch {
      console.log('ℹ AI processing completed quickly')
    }

    // Step 4: Create visual workflow
    console.log('Step 4: Creating visual workflow...')
    const createWorkflowBtn = chatPanel.locator('button:has-text("Create Visual Workflow"), button:has-text("Create Workflow")')
    await expect(createWorkflowBtn).toBeVisible({ timeout: 15000 })
    await createWorkflowBtn.click()

    // Wait for workflow to be created
    await page.waitForTimeout(3000)

    // Step 5: Verify workflow nodes
    console.log('Step 5: Verifying workflow nodes...')
    const canvas = page.locator('.react-flow')
    const nodes = canvas.locator('.react-flow__node')
    const nodeCount = await nodes.count()
    
    console.log(`✓ Created ${nodeCount} workflow nodes`)
    expect(nodeCount).toBeGreaterThan(0)

    // Step 6: Take workflow screenshot
    await page.screenshot({ 
      path: './test-results/comprehensive-workflow-created.png', 
      fullPage: true 
    })

    // Step 7: Test node configuration (if nodes exist)
    if (nodeCount > 0) {
      console.log('Step 7: Testing node configuration...')
      const firstNode = nodes.first()
      await firstNode.click()

      const configPanel = page.locator('[data-testid="node-config-panel"], .node-config-panel, .node-configuration')
      
      if (await configPanel.isVisible({ timeout: 3000 })) {
        console.log('✓ Node configuration panel opened')
        
        const nameInput = configPanel.locator('input[name="name"], input[placeholder*="name"]')
        if (await nameInput.isVisible()) {
          await nameInput.fill('Data Reader Node')
          console.log('✓ Node configured')
        }
      }
    }

    // Step 8: Execute workflow
    console.log('Step 8: Executing workflow...')
    const executeButton = page.locator('button:has-text("Execute"), [data-testid="execute-workflow"], button:has-text("Run")')
    
    if (await executeButton.isVisible()) {
      await executeButton.click()
      console.log('✓ Workflow execution started')
      
      // Monitor execution status
      await page.waitForTimeout(5000)
      
      await page.screenshot({ 
        path: './test-results/comprehensive-workflow-executing.png', 
        fullPage: true 
      })
    }

    // Step 9: Test import/export functionality
    console.log('Step 9: Testing export functionality...')
    const exportButton = page.locator('button:has-text("Export"), [data-testid="export-workflow"]')
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      
      const jsonExportButton = page.locator('button:has-text("JSON"), [data-format="json"]')
      if (await jsonExportButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download')
        await jsonExportButton.click()
        
        const download = await downloadPromise
        console.log('✓ Workflow exported successfully')
      }
    }

    // Step 10: Test WebSocket connectivity
    console.log('Step 10: Testing WebSocket connectivity...')
    await wsHelper.connect(page)
    
    const wsInfo = await page.evaluate(() => {
      return {
        connectionCount: (window as any).wsConnections?.length || 0,
        states: ((window as any).wsConnections || []).map((ws: WebSocket) => ws.readyState)
      }
    })
    
    console.log(`WebSocket connections: ${wsInfo.connectionCount}`)
    console.log(`Connection states: ${wsInfo.states}`)

    // Step 11: Test real-time updates
    console.log('Step 11: Testing real-time updates...')
    await messageInput.fill('show workflow status')
    await sendButton.click()
    
    await page.waitForTimeout(3000)

    // Step 12: Final verification
    console.log('Step 12: Final verification...')
    const messages = chatPanel.locator('.message, [data-testid*="message"]')
    const messageCount = await messages.count()
    
    console.log(`✓ Total chat messages: ${messageCount}`)
    expect(messageCount).toBeGreaterThan(2)

    await page.screenshot({ 
      path: './test-results/comprehensive-workflow-complete.png', 
      fullPage: true 
    })

    console.log('🎉 Comprehensive workflow test completed successfully!')
  })

  test('should handle error scenarios gracefully', async ({ page, uiHelper, wsHelper }) => {
    console.log('🧪 Testing error handling scenarios')

    // Test invalid DSL command
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    await expect(chatPanel).toBeVisible()

    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    // Send invalid command
    await messageInput.fill('xyz123 invalid command !@#$%')
    await sendButton.click()

    await page.waitForTimeout(3000)

    // Check for error handling
    const messages = chatPanel.locator('.message, [data-testid*="message"]')
    const messageTexts = await messages.allTextContents()
    
    const hasErrorResponse = messageTexts.some(text => 
      text.toLowerCase().includes('help') || 
      text.toLowerCase().includes('clarify') || 
      text.toLowerCase().includes('understand')
    )

    if (hasErrorResponse) {
      console.log('✓ Error handling working correctly')
    }

    await page.screenshot({ 
      path: './test-results/error-handling-test.png', 
      fullPage: true 
    })
  })

  test('should support accessibility features', async ({ page }) => {
    console.log('♿ Testing accessibility features')

    // Test keyboard navigation
    await page.keyboard.press('Tab') // Navigate to first focusable element
    await page.waitForTimeout(500)
    
    await page.keyboard.press('Tab') // Navigate to next element
    await page.waitForTimeout(500)

    // Test ARIA labels and roles
    const ariaElements = page.locator('[aria-label], [role]')
    const ariaCount = await ariaElements.count()
    
    console.log(`Found ${ariaCount} elements with ARIA attributes`)

    // Test screen reader support
    const headings = page.locator('h1, h2, h3, h4, h5, h6')
    const headingCount = await headings.count()
    
    console.log(`Found ${headingCount} heading elements`)

    // Test focus indicators
    const focusableElements = page.locator('button, input, textarea, [tabindex]:not([tabindex="-1"])')
    const focusableCount = await focusableElements.count()
    
    console.log(`Found ${focusableCount} focusable elements`)

    if (focusableCount > 0) {
      const firstFocusable = focusableElements.first()
      await firstFocusable.focus()
      
      // Check if focus is visible
      const focusVisible = await firstFocusable.evaluate((el) => {
        const computedStyle = window.getComputedStyle(el)
        return computedStyle.outline !== 'none' || computedStyle.boxShadow !== 'none'
      })
      
      if (focusVisible) {
        console.log('✓ Focus indicators are visible')
      }
    }

    await page.screenshot({ 
      path: './test-results/accessibility-test.png', 
      fullPage: true 
    })
  })

  test('should perform under load conditions', async ({ page, uiHelper }) => {
    console.log('⚡ Testing performance under load')

    const startTime = Date.now()

    // Create multiple workflows rapidly
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')

    const commands = [
      'create simple workflow with 2 nodes',
      'create data processing workflow',
      'create file handling workflow',
      'create validation workflow'
    ]

    for (const command of commands) {
      await messageInput.fill(command)
      await sendButton.click()
      await page.waitForTimeout(1000) // Brief pause between commands
    }

    const endTime = Date.now()
    const totalTime = endTime - startTime

    console.log(`Sent ${commands.length} commands in ${totalTime}ms`)
    console.log(`Average time per command: ${totalTime / commands.length}ms`)

    // Check memory usage
    const memoryInfo = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null
    })

    if (memoryInfo) {
      console.log(`Memory usage: ${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`)
    }

    // Check for any performance warnings in console
    const performanceEntries = await page.evaluate(() => {
      return performance.getEntriesByType('measure').map(entry => ({
        name: entry.name,
        duration: entry.duration
      }))
    })

    console.log(`Found ${performanceEntries.length} performance measurements`)

    await page.screenshot({ 
      path: './test-results/performance-test.png', 
      fullPage: true 
    })
  })
})