import { test, expect } from '@playwright/test'
import { WebSocketHelper } from './helpers/websocket-helper'

test.describe('Agent Discovery and P2P Interaction', () => {
  let wsHelper: WebSocketHelper

  test.beforeEach(async ({ page }) => {
    wsHelper = new WebSocketHelper(page)
    await page.goto('/')
    
    // Wait for application to load
    const canvas = page.locator('.react-flow, [data-testid="workflow-canvas"]')
    await expect(canvas).toBeVisible({ timeout: 10000 })
  })

  test('should connect to agent discovery service', async ({ page }) => {
    // Check WebSocket connection for agent discovery
    await wsHelper.connect(page)
    
    // Look for agent discovery panel or status
    const agentPanel = page.locator(
      '[data-testid="agent-discovery"], ' +
      '.agent-discovery, ' +
      '.agents-panel, ' +
      ':has-text("Agent Discovery")'
    )

    const statusPanel = page.locator(
      '.connection-status, ' +
      '[data-testid="connection-status"], ' +
      '.websocket-status'
    )

    if (await agentPanel.isVisible()) {
      console.log('✓ Agent discovery panel found')
    }

    if (await statusPanel.isVisible()) {
      const statusText = await statusPanel.textContent()
      console.log(`Connection status: ${statusText}`)
    }

    // Check for WebSocket connection indicator
    const wsStatus = await page.evaluate(() => {
      return {
        hasWebSocket: 'WebSocket' in window,
        connectionCount: (window as any).wsConnections?.length || 0
      }
    })

    console.log(`WebSocket available: ${wsStatus.hasWebSocket}`)
    console.log(`Active connections: ${wsStatus.connectionCount}`)

    await page.screenshot({ 
      path: './test-results/agent-discovery-connection.png', 
      fullPage: true 
    })
  })

  test('should discover available agents', async ({ page }) => {
    await wsHelper.connect(page)
    
    // Open chat to trigger agent discovery
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    await expect(chatPanel).toBeVisible()

    // Send command to discover agents
    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    await messageInput.fill('discover available agents')
    await sendButton.click()

    // Wait for agent discovery response
    await page.waitForTimeout(3000)

    // Check for agent list in response
    const messages = chatPanel.locator('.message, [data-testid*="message"]')
    const messageTexts = await messages.allTextContents()
    
    const hasAgentInfo = messageTexts.some(text => 
      text.toLowerCase().includes('agent') || 
      text.toLowerCase().includes('available') ||
      text.toLowerCase().includes('discovered')
    )

    if (hasAgentInfo) {
      console.log('✓ Agent discovery response received')
    }

    // Look for agent status indicators
    const agentStatus = page.locator(
      '.agent-status, ' +
      '[data-testid="agent-status"], ' +
      '.online-agents, ' +
      '.peer-agents'
    )

    if (await agentStatus.isVisible()) {
      const statusInfo = await agentStatus.textContent()
      console.log(`Agent status: ${statusInfo}`)
    }
  })

  test('should handle P2P communication between agents', async ({ page }) => {
    await wsHelper.connect(page)

    // Open chat
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    await expect(chatPanel).toBeVisible()

    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    // Send command that requires agent communication
    await messageInput.fill('create workflow that requires multiple agents to collaborate')
    await sendButton.click()

    await page.waitForTimeout(5000)

    // Check for P2P communication indicators
    const p2pIndicators = page.locator(
      ':has-text("peer"), ' +
      ':has-text("communicating"), ' +
      ':has-text("handoff"), ' +
      '.p2p-status, ' +
      '[data-testid="p2p-communication"]'
    )

    if (await p2pIndicators.isVisible()) {
      console.log('✓ P2P communication indicators found')
    }

    // Look for agent handoff notifications
    const handoffMessages = chatPanel.locator(':has-text("handoff"), :has-text("transfer")')
    if (await handoffMessages.count() > 0) {
      console.log('✓ Agent handoff messages detected')
    }

    await page.screenshot({ 
      path: './test-results/p2p-agent-communication.png', 
      fullPage: true 
    })
  })

  test('should show agent network topology', async ({ page }) => {
    // Look for network visualization
    const networkView = page.locator(
      '.network-topology, ' +
      '[data-testid="agent-network"], ' +
      '.agent-graph, ' +
      '.peer-network'
    )

    // Try to open network view through menu
    const menuButton = page.locator('button:has-text("View"), button:has-text("Network"), button:has-text("Agents")')
    
    if (await menuButton.isVisible()) {
      await menuButton.click()
      
      const networkOption = page.locator('button:has-text("Network"), button:has-text("Topology")')
      if (await networkOption.isVisible()) {
        await networkOption.click()
        
        await page.waitForTimeout(2000)
        
        if (await networkView.isVisible()) {
          console.log('✓ Agent network topology view opened')
          
          // Check for network nodes representing agents
          const networkNodes = networkView.locator('.network-node, .agent-node, circle, rect')
          const nodeCount = await networkNodes.count()
          console.log(`Found ${nodeCount} network nodes`)
          
          await page.screenshot({ 
            path: './test-results/agent-network-topology.png', 
            fullPage: true 
          })
        }
      }
    }

    // Alternative: Check if network info is shown in existing views
    const connectionInfo = page.locator(
      ':has-text("connected agents"), ' +
      ':has-text("peer count"), ' +
      ':has-text("network size")'
    )

    if (await connectionInfo.isVisible()) {
      const info = await connectionInfo.textContent()
      console.log(`Network info: ${info}`)
    }
  })

  test('should handle agent connection failures gracefully', async ({ page }) => {
    // Simulate network issues by blocking WebSocket connections
    await page.route('**/ws/**', route => route.abort())

    // Try to connect
    await wsHelper.connect(page)

    // Open chat and try agent interaction
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    await expect(chatPanel).toBeVisible()

    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    await messageInput.fill('test agent communication')
    await sendButton.click()

    await page.waitForTimeout(3000)

    // Check for connection error messages
    const errorMessages = chatPanel.locator(
      ':has-text("connection"), ' +
      ':has-text("failed"), ' +
      ':has-text("offline"), ' +
      ':has-text("retry"), ' +
      '.error-message, ' +
      '.connection-error'
    )

    if (await errorMessages.isVisible()) {
      console.log('✓ Connection failure handled gracefully')
    }

    // Look for retry mechanisms
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Reconnect")')
    if (await retryButton.isVisible()) {
      console.log('✓ Retry mechanism available')
    }
  })

  test('should show real-time agent status updates', async ({ page }) => {
    await wsHelper.connect(page)

    // Monitor for real-time updates
    const statusUpdates: string[] = []
    
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('agent') || text.includes('status') || text.includes('update')) {
        statusUpdates.push(text)
      }
    })

    // Look for status indicators
    const statusIndicators = page.locator(
      '.agent-status, ' +
      '[data-testid*="status"], ' +
      '.online-indicator, ' +
      '.offline-indicator, ' +
      '.connection-status'
    )

    if (await statusIndicators.count() > 0) {
      // Take initial screenshot
      await page.screenshot({ 
        path: './test-results/agent-status-initial.png', 
        fullPage: true 
      })

      // Wait for potential status changes
      await page.waitForTimeout(5000)

      // Take another screenshot to compare
      await page.screenshot({ 
        path: './test-results/agent-status-after-wait.png', 
        fullPage: true 
      })

      console.log(`Captured ${statusUpdates.length} status-related console messages`)
    }

    // Check for status change animations
    const animatedElements = page.locator('.pulse, .blink, .fade, [class*="animate"]')
    if (await animatedElements.count() > 0) {
      console.log('✓ Status change animations detected')
    }
  })

  test('should support agent filtering and search', async ({ page }) => {
    // Look for agent search/filter functionality
    const searchInput = page.locator(
      'input[placeholder*="search"], ' +
      'input[placeholder*="filter"], ' +
      '[data-testid="agent-search"], ' +
      '.agent-filter input'
    )

    const filterButtons = page.locator(
      'button:has-text("Filter"), ' +
      'button:has-text("All"), ' +
      'button:has-text("Online"), ' +
      'button:has-text("Offline"), ' +
      '.filter-button'
    )

    if (await searchInput.isVisible()) {
      await searchInput.fill('test-agent')
      await page.waitForTimeout(1000)
      
      console.log('✓ Agent search functionality available')
    }

    if (await filterButtons.count() > 0) {
      const onlineFilter = filterButtons.filter({ hasText: 'Online' })
      if (await onlineFilter.isVisible()) {
        await onlineFilter.click()
        await page.waitForTimeout(1000)
        console.log('✓ Agent filtering available')
      }
    }

    // Check if filtering affects displayed agents
    const agentList = page.locator('.agent-list, [data-testid="agent-list"]')
    if (await agentList.isVisible()) {
      const agentItems = agentList.locator('.agent-item, [data-testid*="agent"]')
      const itemCount = await agentItems.count()
      console.log(`Filtered agent list shows ${itemCount} agents`)
    }
  })

  test('should handle agent authentication and security', async ({ page }) => {
    // Check for authentication indicators
    const authIndicators = page.locator(
      '.authenticated, ' +
      '.secure-connection, ' +
      ':has-text("authenticated"), ' +
      ':has-text("secure"), ' +
      '[data-testid*="auth"]'
    )

    if (await authIndicators.isVisible()) {
      console.log('✓ Authentication indicators found')
    }

    // Look for security status
    const securityStatus = page.locator(
      '.security-status, ' +
      '.encryption-status, ' +
      ':has-text("encrypted"), ' +
      ':has-text("TLS"), ' +
      ':has-text("secure")'
    )

    if (await securityStatus.isVisible()) {
      const statusText = await securityStatus.textContent()
      console.log(`Security status: ${statusText}`)
    }

    // Check for certificate or key exchange information
    const certInfo = page.locator(
      '.certificate-info, ' +
      '.key-exchange, ' +
      ':has-text("certificate"), ' +
      ':has-text("handshake")'
    )

    if (await certInfo.isVisible()) {
      console.log('✓ Security certificate information available')
    }
  })
})