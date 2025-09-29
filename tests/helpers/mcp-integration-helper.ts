import { Page, expect, BrowserContext } from '@playwright/test';

/**
 * MCP Integration Helper
 * 
 * This helper provides utilities for testing the integration between
 * the frontend and Python backend using MCP browser automation patterns.
 */

export class MCPIntegrationHelper {
  constructor(
    private page: Page,
    private frontendUrl: string = 'http://localhost:3001',
    private backendUrl: string = 'http://localhost:8000'
  ) {}

  /**
   * Initialize MCP browser environment
   */
  async initializeMCPEnvironment() {
    // Configure page for MCP testing
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    await this.page.setExtraHTTPHeaders({
      'User-Agent': 'MCP-Test-Browser/1.0',
      'Accept': 'application/json, text/html, */*'
    });

    // Enable request/response monitoring
    this.setupNetworkMonitoring();
    this.setupWebSocketMonitoring();
    this.setupConsoleMonitoring();
  }

  /**
   * Navigate to frontend and wait for it to be ready
   */
  async navigateToFrontend() {
    console.log('🌐 Navigating to frontend:', this.frontendUrl);
    
    const response = await this.page.goto(this.frontendUrl);
    expect(response?.status()).toBe(200);
    
    await this.page.waitForLoadState('networkidle');
    await this.takeScreenshot('frontend-loaded');
    
    console.log('✅ Frontend loaded successfully');
    return response;
  }

  /**
   * Test backend connectivity
   */
  async testBackendConnectivity() {
    console.log('🔗 Testing backend connectivity...');
    
    const endpoints = [
      { path: '/health', required: true },
      { path: '/agent/card', required: true },
      { path: '/api/tools', required: false },
      { path: '/api/status', required: false }
    ];

    const results = [];

    for (const endpoint of endpoints) {
      try {
        const response = await this.page.request.get(`${this.backendUrl}${endpoint.path}`);
        const status = response.status();
        
        let data = null;
        try {
          data = await response.json();
        } catch {
          // Non-JSON response
        }

        results.push({
          path: endpoint.path,
          status,
          success: status === 200,
          required: endpoint.required,
          data
        });

        console.log(`${status === 200 ? '✅' : '❌'} ${endpoint.path}: ${status}`);
      } catch (error) {
        results.push({
          path: endpoint.path,
          status: 0,
          success: false,
          required: endpoint.required,
          error: error.message
        });

        console.log(`❌ ${endpoint.path}: Error - ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Find and interact with DSL command input
   */
  async findAndTestCommandInput() {
    console.log('🔍 Looking for DSL command input...');
    
    const inputSelectors = [
      'input[type="text"]',
      'textarea',
      '[data-testid*="command"]',
      '[data-testid*="input"]',
      '[data-testid*="dsl"]',
      '[placeholder*="command" i]',
      '[placeholder*="DSL" i]',
      '[placeholder*="enter" i]'
    ];

    let commandInput = null;
    let inputType = 'none';

    for (const selector of inputSelectors) {
      const element = this.page.locator(selector).first();
      if (await element.isVisible().catch(() => false)) {
        commandInput = element;
        inputType = selector;
        break;
      }
    }

    if (commandInput) {
      console.log(`✅ Found command input: ${inputType}`);
      
      await this.takeScreenshot('command-input-found');
      
      // Test typing a DSL command
      await commandInput.click();
      await commandInput.fill('CALL test_tool --arg "hello world"');
      
      await this.takeScreenshot('command-input-filled');
      
      // Look for submit mechanism
      const submitButton = this.page.locator(
        'button[type="submit"], button:has-text("Execute"), button:has-text("Run"), button:has-text("Send")'
      ).first();
      
      if (await submitButton.isVisible().catch(() => false)) {
        console.log('✅ Found submit button');
        await submitButton.click();
      } else {
        console.log('📝 Trying Enter key...');
        await commandInput.press('Enter');
      }
      
      // Wait for response
      await this.page.waitForTimeout(3000);
      await this.takeScreenshot('command-submitted');
      
      return true;
    } else {
      console.log('❌ No command input found');
      return false;
    }
  }

  /**
   * Monitor and analyze UI elements
   */
  async analyzeUIElements() {
    console.log('🔍 Analyzing UI elements...');
    
    const analysis = {
      clickableElements: 0,
      inputElements: 0,
      textElements: 0,
      statusIndicators: 0,
      hasNavigation: false,
      hasWorkflowElements: false
    };

    // Count different element types
    analysis.clickableElements = await this.page.locator('button, a, [role="button"], [onclick]').count();
    analysis.inputElements = await this.page.locator('input, textarea, [contenteditable="true"]').count();
    analysis.textElements = await this.page.locator('p, span, div:has-text("")').count();

    // Check for status indicators
    const statusElements = await this.page.locator(
      '[data-testid*="status"], [class*="status"], [data-testid*="connection"], [class*="connection"]'
    ).count();
    analysis.statusIndicators = statusElements;

    // Check for navigation
    const navElements = await this.page.locator('nav, [role="navigation"], header').count();
    analysis.hasNavigation = navElements > 0;

    // Check for workflow elements
    const workflowElements = await this.page.locator(
      '[data-testid*="workflow"], [class*="workflow"], [data-testid*="node"], [class*="node"]'
    ).count();
    analysis.hasWorkflowElements = workflowElements > 0;

    console.log('📊 UI Analysis Results:');
    console.log(`- Clickable elements: ${analysis.clickableElements}`);
    console.log(`- Input elements: ${analysis.inputElements}`);
    console.log(`- Status indicators: ${analysis.statusIndicators}`);
    console.log(`- Has navigation: ${analysis.hasNavigation}`);
    console.log(`- Has workflow elements: ${analysis.hasWorkflowElements}`);

    await this.takeScreenshot('ui-analysis');
    
    return analysis;
  }

  /**
   * Test WebSocket functionality
   */
  async testWebSocketConnection() {
    console.log('🔌 Testing WebSocket connections...');
    
    const wsConnections: any[] = [];
    const wsMessages: any[] = [];

    this.page.on('websocket', ws => {
      wsConnections.push({
        url: ws.url(),
        timestamp: Date.now()
      });

      console.log('📡 WebSocket connected:', ws.url());

      ws.on('framesent', event => {
        wsMessages.push({
          type: 'sent',
          payload: event.payload,
          timestamp: Date.now()
        });
      });

      ws.on('framereceived', event => {
        wsMessages.push({
          type: 'received',
          payload: event.payload,
          timestamp: Date.now()
        });
      });
    });

    // Wait for connections to establish
    await this.page.waitForTimeout(10000);

    console.log(`📊 WebSocket Summary:`);
    console.log(`- Connections: ${wsConnections.length}`);
    console.log(`- Messages: ${wsMessages.length}`);

    if (wsConnections.length > 0) {
      console.log('✅ WebSocket connections established');
      wsConnections.forEach(conn => {
        console.log(`  - ${conn.url}`);
      });
    } else {
      console.log('❌ No WebSocket connections found');
    }

    return { connections: wsConnections, messages: wsMessages };
  }

  /**
   * Run comprehensive integration test
   */
  async runComprehensiveTest() {
    console.log('🚀 Starting comprehensive MCP integration test...');
    
    await this.initializeMCPEnvironment();
    
    const results = {
      frontend: false,
      backend: false,
      uiElements: null,
      commandInput: false,
      websocket: false,
      errors: []
    };

    try {
      // Test frontend
      await this.navigateToFrontend();
      results.frontend = true;
    } catch (error) {
      results.errors.push(`Frontend: ${error.message}`);
    }

    try {
      // Test backend
      const backendResults = await this.testBackendConnectivity();
      results.backend = backendResults.some(r => r.success);
    } catch (error) {
      results.errors.push(`Backend: ${error.message}`);
    }

    try {
      // Analyze UI
      results.uiElements = await this.analyzeUIElements();
    } catch (error) {
      results.errors.push(`UI Analysis: ${error.message}`);
    }

    try {
      // Test command input
      results.commandInput = await this.findAndTestCommandInput();
    } catch (error) {
      results.errors.push(`Command Input: ${error.message}`);
    }

    try {
      // Test WebSocket
      const wsResults = await this.testWebSocketConnection();
      results.websocket = wsResults.connections.length > 0;
    } catch (error) {
      results.errors.push(`WebSocket: ${error.message}`);
    }

    await this.takeScreenshot('comprehensive-test-complete');

    console.log('📋 Comprehensive Test Results:');
    console.log(`- Frontend: ${results.frontend ? '✅' : '❌'}`);
    console.log(`- Backend: ${results.backend ? '✅' : '❌'}`);
    console.log(`- Command Input: ${results.commandInput ? '✅' : '❌'}`);
    console.log(`- WebSocket: ${results.websocket ? '✅' : '❌'}`);
    
    if (results.errors.length > 0) {
      console.log('❌ Errors encountered:');
      results.errors.forEach(error => console.log(`  - ${error}`));
    }

    return results;
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring() {
    const requests: any[] = [];
    const responses: any[] = [];

    this.page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    });

    this.page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        timestamp: Date.now()
      });
    });

    // Store for access
    (this.page as any)._networkMonitoring = { requests, responses };
  }

  /**
   * Setup WebSocket monitoring
   */
  private setupWebSocketMonitoring() {
    const wsConnections: any[] = [];
    
    this.page.on('websocket', ws => {
      wsConnections.push(ws);
    });

    (this.page as any)._wsMonitoring = wsConnections;
  }

  /**
   * Setup console monitoring
   */
  private setupConsoleMonitoring() {
    const consoleMessages: any[] = [];

    this.page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      });
    });

    (this.page as any)._consoleMonitoring = consoleMessages;
  }

  /**
   * Take screenshot with timestamp
   */
  private async takeScreenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({
      path: `test-results/mcp-${name}-${timestamp}.png`,
      fullPage: true
    });
  }
}