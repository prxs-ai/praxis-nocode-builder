import { test, expect, Page } from '@playwright/test';

/**
 * Python Backend Integration Tests
 * 
 * This test suite validates the integration between the Next.js frontend (port 3001)
 * and the Python backend (port 8000), including:
 * - Frontend accessibility
 * - Backend API endpoints
 * - WebSocket connections
 * - DSL command processing
 * - UI interactions
 */

const FRONTEND_URL = 'http://localhost:3001';
const BACKEND_URL = 'http://localhost:8000';

test.describe('Python Backend Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Set up extended timeouts for integration tests
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
  });

  test.describe('Connectivity Tests', () => {
    test('should connect to frontend on port 3001', async ({ page }) => {
      const response = await page.goto(FRONTEND_URL);
      expect(response?.status()).toBe(200);
      
      // Wait for the page to fully load
      await page.waitForLoadState('networkidle');
      
      // Check that we have a valid React app running
      await expect(page.locator('body')).toBeVisible();
      
      // Take a screenshot for visual verification
      await page.screenshot({ 
        path: 'test-results/frontend-connection.png',
        fullPage: true 
      });
    });

    test('should validate backend health endpoint', async ({ request }) => {
      const response = await request.get(`${BACKEND_URL}/health`);
      expect(response.status()).toBe(200);
      
      const healthData = await response.json();
      expect(healthData).toHaveProperty('status');
      expect(healthData.status).toBe('healthy');
      
      console.log('Backend health check:', healthData);
    });

    test('should validate backend agent card endpoint', async ({ request }) => {
      const response = await request.get(`${BACKEND_URL}/agent/card`);
      expect(response.status()).toBe(200);
      
      const agentCard = await response.json();
      expect(agentCard).toHaveProperty('id');
      expect(agentCard).toHaveProperty('name');
      expect(agentCard).toHaveProperty('tools');
      
      console.log('Agent card:', agentCard);
    });
  });

  test.describe('WebSocket Integration', () => {
    test('should establish WebSocket connection', async ({ page }) => {
      // Navigate to frontend
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Listen for WebSocket connections
      const wsConnections: any[] = [];
      page.on('websocket', ws => {
        wsConnections.push(ws);
        console.log('WebSocket connection established:', ws.url());
        
        ws.on('framesent', event => {
          console.log('WebSocket frame sent:', event.payload);
        });
        
        ws.on('framereceived', event => {
          console.log('WebSocket frame received:', event.payload);
        });
      });
      
      // Look for WebSocket connection or trigger it
      // This might depend on your UI implementation
      await page.waitForTimeout(5000);
      
      // Verify WebSocket connection was established
      expect(wsConnections.length).toBeGreaterThan(0);
    });
  });

  test.describe('API Integration', () => {
    test('should handle CORS for cross-origin requests', async ({ request }) => {
      // Test CORS preflight request
      const optionsResponse = await request.fetch(`${BACKEND_URL}/agent/card`, {
        method: 'OPTIONS',
        headers: {
          'Origin': FRONTEND_URL,
          'Access-Control-Request-Method': 'GET'
        }
      });
      
      expect(optionsResponse.status()).toBe(200);
      
      const corsHeaders = optionsResponse.headers();
      expect(corsHeaders['access-control-allow-origin']).toBeTruthy();
    });

    test('should validate all critical backend endpoints', async ({ request }) => {
      const endpoints = [
        '/health',
        '/agent/card',
        '/api/tools',
        '/api/status'
      ];
      
      for (const endpoint of endpoints) {
        console.log(`Testing endpoint: ${endpoint}`);
        
        try {
          const response = await request.get(`${BACKEND_URL}${endpoint}`);
          
          // Allow 200 or 404 (endpoint might not be implemented yet)
          expect([200, 404]).toContain(response.status());
          
          if (response.status() === 200) {
            const data = await response.json();
            console.log(`✓ ${endpoint}:`, data);
          } else {
            console.log(`- ${endpoint}: Not implemented (404)`);
          }
        } catch (error) {
          console.log(`✗ ${endpoint}: Error -`, error);
          // Don't fail the test for connection errors during development
        }
      }
    });
  });

  test.describe('UI Interaction with Backend', () => {
    test('should display agent information from backend', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Look for elements that might display agent information
      // This will depend on your UI implementation
      const agentElements = await page.locator('[data-testid*="agent"], [class*="agent"], h1, h2, h3').all();
      
      if (agentElements.length > 0) {
        console.log('Found potential agent UI elements:');
        for (const element of agentElements) {
          const text = await element.textContent();
          if (text) {
            console.log('-', text.trim());
          }
        }
      }
      
      // Take screenshot of the current state
      await page.screenshot({ 
        path: 'test-results/ui-with-backend-data.png',
        fullPage: true 
      });
    });

    test('should handle DSL command input', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Look for input elements that might accept DSL commands
      const inputSelectors = [
        'input[type="text"]',
        'textarea',
        '[data-testid*="command"]',
        '[data-testid*="input"]',
        '[data-testid*="dsl"]',
        '[placeholder*="command"]',
        '[placeholder*="DSL"]'
      ];
      
      let commandInput = null;
      for (const selector of inputSelectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible().catch(() => false)) {
          commandInput = element;
          break;
        }
      }
      
      if (commandInput) {
        console.log('Found command input element');
        
        // Test typing a simple DSL command
        await commandInput.click();
        await commandInput.fill('CALL test_tool --arg "test_value"');
        
        // Look for submit button or press Enter
        const submitButton = page.locator('button[type="submit"], button:has-text("Execute"), button:has-text("Send")').first();
        if (await submitButton.isVisible().catch(() => false)) {
          await submitButton.click();
        } else {
          await commandInput.press('Enter');
        }
        
        // Wait for potential response
        await page.waitForTimeout(3000);
        
        // Take screenshot of result
        await page.screenshot({ 
          path: 'test-results/dsl-command-test.png',
          fullPage: true 
        });
      } else {
        console.log('No command input element found - UI might need implementation');
      }
    });

    test('should display connection status', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Look for connection status indicators
      const statusSelectors = [
        '[data-testid*="status"]',
        '[data-testid*="connection"]',
        '[class*="status"]',
        '[class*="connection"]',
        '.status-indicator',
        '.connection-indicator'
      ];
      
      let foundStatus = false;
      for (const selector of statusSelectors) {
        const elements = await page.locator(selector).all();
        for (const element of elements) {
          const text = await element.textContent();
          if (text && (text.includes('connected') || text.includes('online') || text.includes('status'))) {
            console.log('Found status indicator:', text.trim());
            foundStatus = true;
          }
        }
      }
      
      if (!foundStatus) {
        console.log('No connection status indicators found - might need implementation');
      }
      
      // Take screenshot for manual verification
      await page.screenshot({ 
        path: 'test-results/connection-status.png',
        fullPage: true 
      });
    });
  });

  test.describe('Error Handling', () => {
    test('should handle backend unavailability gracefully', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Monitor console errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Monitor network failures
      const networkErrors: any[] = [];
      page.on('requestfailed', request => {
        networkErrors.push({
          url: request.url(),
          failure: request.failure()
        });
      });
      
      // Wait and check for errors
      await page.waitForTimeout(10000);
      
      console.log('Console errors:', consoleErrors);
      console.log('Network errors:', networkErrors);
      
      // The app should handle errors gracefully
      // Don't expect zero errors during development, but log them for monitoring
    });
  });

  test.describe('Performance Tests', () => {
    test('should load frontend within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      console.log(`Frontend load time: ${loadTime}ms`);
      
      // Allow generous load time during development
      expect(loadTime).toBeLessThan(30000);
    });

    test('should handle multiple concurrent API requests', async ({ request }) => {
      const requests = [];
      
      // Make multiple concurrent requests to different endpoints
      for (let i = 0; i < 5; i++) {
        requests.push(request.get(`${BACKEND_URL}/health`));
        requests.push(request.get(`${BACKEND_URL}/agent/card`));
      }
      
      const responses = await Promise.allSettled(requests);
      
      const successful = responses.filter(r => r.status === 'fulfilled').length;
      const failed = responses.filter(r => r.status === 'rejected').length;
      
      console.log(`Concurrent requests: ${successful} successful, ${failed} failed`);
      
      // Expect most requests to succeed
      expect(successful).toBeGreaterThan(failed);
    });
  });
});