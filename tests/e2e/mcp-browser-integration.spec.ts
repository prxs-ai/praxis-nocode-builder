import { test, expect } from '@playwright/test';

/**
 * MCP Browser Integration Tests
 * 
 * This test suite uses Playwright's browser automation capabilities
 * to test the integration between frontend and Python backend through
 * actual browser interactions, simulating real user workflows.
 */

const FRONTEND_URL = 'http://localhost:3001';
const BACKEND_URL = 'http://localhost:8000';

test.describe('MCP Browser Automation Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Configure page for MCP-style automation
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({
      'User-Agent': 'MCP-Playwright-Browser/1.0'
    });
  });

  test.describe('Browser-based Frontend Testing', () => {
    test('should navigate and take full page snapshot', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Take comprehensive screenshot
      await page.screenshot({ 
        path: 'test-results/mcp-frontend-full-page.png',
        fullPage: true 
      });
      
      // Get page title and basic info
      const title = await page.title();
      const url = page.url();
      
      console.log('MCP Browser Navigation Results:');
      console.log('- Page Title:', title);
      console.log('- Current URL:', url);
      
      // Verify basic page structure
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang');
    });

    test('should interact with UI elements through browser automation', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Find and interact with clickable elements
      const clickableElements = await page.locator('button, a, [role="button"], [onclick]').all();
      
      console.log(`Found ${clickableElements.length} clickable elements`);
      
      for (let i = 0; i < Math.min(clickableElements.length, 5); i++) {
        const element = clickableElements[i];
        const text = await element.textContent();
        const isVisible = await element.isVisible();
        
        if (isVisible && text) {
          console.log(`Clickable element ${i + 1}: "${text.trim()}"`);
          
          // Take screenshot before clicking
          await page.screenshot({ 
            path: `test-results/mcp-before-click-${i + 1}.png` 
          });
          
          try {
            await element.click({ timeout: 5000 });
            await page.waitForTimeout(1000);
            
            // Take screenshot after clicking
            await page.screenshot({ 
              path: `test-results/mcp-after-click-${i + 1}.png` 
            });
          } catch (error) {
            console.log(`Could not click element ${i + 1}:`, error);
          }
        }
      }
    });

    test('should test form inputs and data entry', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Find form inputs
      const inputs = await page.locator('input, textarea, [contenteditable="true"]').all();
      
      console.log(`Found ${inputs.length} input elements`);
      
      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        const type = await input.getAttribute('type') || 'text';
        const placeholder = await input.getAttribute('placeholder') || '';
        
        if (await input.isVisible() && await input.isEnabled()) {
          console.log(`Input ${i + 1}: type="${type}", placeholder="${placeholder}"`);
          
          try {
            await input.click();
            
            // Test different input types
            if (type === 'text' || type === 'search' || !type) {
              await input.fill('MCP test input');
            } else if (type === 'number') {
              await input.fill('123');
            } else if (type === 'email') {
              await input.fill('test@mcp.example');
            }
            
            await page.waitForTimeout(500);
            
            // Take screenshot of filled input
            await page.screenshot({ 
              path: `test-results/mcp-input-${i + 1}-filled.png` 
            });
            
          } catch (error) {
            console.log(`Could not interact with input ${i + 1}:`, error);
          }
        }
      }
    });
  });

  test.describe('Backend Integration through Browser', () => {
    test('should monitor network requests through browser', async ({ page }) => {
      const requests: any[] = [];
      const responses: any[] = [];
      
      // Monitor all network activity
      page.on('request', request => {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          timestamp: Date.now()
        });
      });
      
      page.on('response', response => {
        responses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers(),
          timestamp: Date.now()
        });
      });
      
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Wait for any additional async requests
      await page.waitForTimeout(5000);
      
      console.log('Network Activity Summary:');
      console.log(`- Total requests: ${requests.length}`);
      console.log(`- Total responses: ${responses.length}`);
      
      // Analyze backend requests
      const backendRequests = requests.filter(req => req.url.includes('localhost:8000'));
      const backendResponses = responses.filter(res => res.url.includes('localhost:8000'));
      
      console.log(`- Backend requests: ${backendRequests.length}`);
      console.log(`- Backend responses: ${backendResponses.length}`);
      
      if (backendRequests.length > 0) {
        console.log('Backend request URLs:');
        backendRequests.forEach(req => {
          console.log(`  ${req.method} ${req.url}`);
        });
      }
    });

    test('should simulate user workflow with backend interaction', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Simulate a complete user workflow
      console.log('Starting user workflow simulation...');
      
      // Step 1: Look for dashboard or main interface
      await page.screenshot({ path: 'test-results/mcp-workflow-step-1-landing.png' });
      
      // Step 2: Try to find and interact with main features
      const mainButtons = await page.locator('button:has-text("Execute"), button:has-text("Run"), button:has-text("Send"), button:has-text("Submit")').all();
      
      if (mainButtons.length > 0) {
        console.log('Found main action buttons, testing workflow...');
        
        for (let i = 0; i < Math.min(mainButtons.length, 3); i++) {
          const button = mainButtons[i];
          const text = await button.textContent();
          
          if (await button.isVisible()) {
            console.log(`Testing workflow with button: "${text}"`);
            
            await page.screenshot({ 
              path: `test-results/mcp-workflow-step-2-${i + 1}-before.png` 
            });
            
            await button.click();
            await page.waitForTimeout(3000);
            
            await page.screenshot({ 
              path: `test-results/mcp-workflow-step-2-${i + 1}-after.png` 
            });
          }
        }
      }
      
      // Step 3: Final state
      await page.screenshot({ path: 'test-results/mcp-workflow-step-3-final.png' });
    });
  });

  test.describe('Real-time Features Testing', () => {
    test('should test WebSocket connections through browser', async ({ page }) => {
      const wsMessages: any[] = [];
      
      // Monitor WebSocket activity
      page.on('websocket', ws => {
        console.log('WebSocket connection detected:', ws.url());
        
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
      
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Wait for WebSocket connections to establish
      await page.waitForTimeout(10000);
      
      console.log('WebSocket Activity Summary:');
      console.log(`- Total messages: ${wsMessages.length}`);
      
      const sentMessages = wsMessages.filter(msg => msg.type === 'sent');
      const receivedMessages = wsMessages.filter(msg => msg.type === 'received');
      
      console.log(`- Sent messages: ${sentMessages.length}`);
      console.log(`- Received messages: ${receivedMessages.length}`);
      
      if (wsMessages.length > 0) {
        console.log('Recent WebSocket messages:');
        wsMessages.slice(-5).forEach((msg, index) => {
          console.log(`  ${msg.type}: ${msg.payload.substring(0, 100)}...`);
        });
      }
    });

    test('should test real-time updates in UI', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Monitor DOM changes
      const initialHTML = await page.innerHTML('body');
      
      await page.screenshot({ path: 'test-results/mcp-realtime-initial.png' });
      
      // Wait for potential real-time updates
      await page.waitForTimeout(15000);
      
      const finalHTML = await page.innerHTML('body');
      
      await page.screenshot({ path: 'test-results/mcp-realtime-final.png' });
      
      // Check if content changed (indicating real-time updates)
      const hasChanged = initialHTML !== finalHTML;
      console.log('Real-time content changes detected:', hasChanged);
      
      if (hasChanged) {
        console.log('UI appears to have real-time updates working');
      } else {
        console.log('No real-time changes detected - may be static or updates not triggered');
      }
    });
  });

  test.describe('Performance and Accessibility', () => {
    test('should measure page performance metrics', async ({ page }) => {
      const navigationStart = Date.now();
      
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      const navigationEnd = Date.now();
      const totalLoadTime = navigationEnd - navigationStart;
      
      // Measure Core Web Vitals
      const metrics = await page.evaluate(() => {
        return new Promise(resolve => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const vitals: any = {};
            
            entries.forEach(entry => {
              if (entry.entryType === 'navigation') {
                vitals.loadTime = entry.loadEventEnd - entry.loadEventStart;
                vitals.domContentLoaded = entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart;
              }
            });
            
            resolve(vitals);
          }).observe({ entryTypes: ['navigation'] });
          
          // Fallback timeout
          setTimeout(() => resolve({}), 5000);
        });
      });
      
      console.log('Performance Metrics:');
      console.log(`- Total navigation time: ${totalLoadTime}ms`);
      console.log(`- DOM metrics:`, metrics);
      
      // Performance thresholds for development
      expect(totalLoadTime).toBeLessThan(30000); // 30 seconds max during development
    });

    test('should check basic accessibility features', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Check for basic accessibility features
      const hasTitle = await page.title() !== '';
      const hasLang = await page.locator('html[lang]').count() > 0;
      const hasHeadings = await page.locator('h1, h2, h3, h4, h5, h6').count() > 0;
      const hasAltTexts = await page.locator('img[alt]').count();
      const totalImages = await page.locator('img').count();
      
      console.log('Accessibility Check:');
      console.log(`- Has page title: ${hasTitle}`);
      console.log(`- Has language attribute: ${hasLang}`);
      console.log(`- Has headings: ${hasHeadings}`);
      console.log(`- Images with alt text: ${hasAltTexts}/${totalImages}`);
      
      // Take screenshot for manual accessibility review
      await page.screenshot({ 
        path: 'test-results/mcp-accessibility-check.png',
        fullPage: true 
      });
    });
  });
});