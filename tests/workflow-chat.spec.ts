import { test, expect } from '@playwright/test';
import { TestHelpers, WorkflowChatPage } from './utils/test-helpers';
test.describe('WorkflowChat Component', () => {
  let helpers: TestHelpers;
  let workflowChat: WorkflowChatPage;
  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    workflowChat = new WorkflowChatPage(page, helpers);
    await helpers.mockAPIEndpoints();
    await helpers.mockWebSocketResponses();
    await page.goto('/');
    await helpers.waitForAppReady();
  });
  test.describe('Chat Interface UI', () => {
    test('should display chat toggle button', async () => {
      await expect(workflowChat.chatToggle).toBeVisible();
    });
    test('should open chat panel when toggle button is clicked', async () => {
      await workflowChat.open();
      await expect(workflowChat.chatPanel).toBeVisible();
    });
    test('should close chat panel when toggle button is clicked again', async () => {
      await workflowChat.open();
      await expect(workflowChat.chatPanel).toBeVisible();
      await workflowChat.chatToggle.click();
      await expect(workflowChat.chatPanel).not.toBeVisible();
    });
    test('should display chat header with title', async () => {
      await workflowChat.open();
      await expect(workflowChat.page.locator('text=Workflow Assistant')).toBeVisible();
    });
    test('should display connection status badge', async () => {
      await workflowChat.open();
      await expect(workflowChat.connectionStatus).toBeVisible();
    });
    test('should show minimize/maximize controls', async () => {
      await workflowChat.open();
      await expect(workflowChat.page.locator('[data-testid="chat-minimize-btn"]')).toBeVisible();
    });
    test('should minimize and maximize chat panel', async () => {
      await workflowChat.open();
      await workflowChat.page.click('[data-testid="chat-minimize-btn"]');
      await expect(workflowChat.chatInput).not.toBeVisible();
      await workflowChat.page.click('[data-testid="chat-maximize-btn"]');
      await expect(workflowChat.chatInput).toBeVisible();
    });
  });
  test.describe('WebSocket Connection Management', () => {
    test('should show disconnect status initially', async () => {
      await workflowChat.open();
      await expect(workflowChat.connectionStatus).toContainText('Disconnected');
    });
    test('should show connect button when disconnected', async () => {
      await workflowChat.open();
      await expect(workflowChat.connectButton).toBeVisible();
      await expect(workflowChat.connectButton).toContainText('Connect to Assistant');
    });
    test('should establish WebSocket connection', async () => {
      await workflowChat.open();
      await workflowChat.page.route('**/ws', route => {
        route.fulfill({
          status: 101,
          headers: { 
            'upgrade': 'websocket',
            'connection': 'upgrade'
          }
        });
      });
      await workflowChat.connect();
      await expect(workflowChat.connectionStatus).toContainText('Connected');
    });
    test('should show disconnect button when connected', async () => {
      await workflowChat.open();
      await workflowChat.connect();
      await expect(workflowChat.disconnectButton).toBeVisible();
      await expect(workflowChat.disconnectButton).toContainText('Disconnect');
    });
    test('should handle connection failures', async () => {
      await workflowChat.open();
      await workflowChat.page.route('**/ws', route => {
        route.abort('failed');
      });
      await workflowChat.connectButton.click();
      await expect(workflowChat.connectionStatus).toContainText('Error');
    });
    test('should show connecting status during connection attempt', async () => {
      await workflowChat.open();
      await workflowChat.page.route('**/ws', route => {
        setTimeout(() => {
          route.fulfill({
            status: 101,
            headers: { 'upgrade': 'websocket' }
          });
        }, 2000);
      });
      await workflowChat.connectButton.click();
      await expect(workflowChat.connectionStatus).toContainText('Connecting');
    });
  });
  test.describe('Chat Message Handling', () => {
    test.beforeEach(async () => {
      await workflowChat.open();
      await workflowChat.connect();
    });
    test('should send regular chat message', async () => {
      const message = 'Hello, how can I create a workflow?';
      await workflowChat.sendMessage(message);
      await expect(workflowChat.messages.filter({ hasText: message })).toBeVisible();
    });
    test('should receive assistant response', async () => {
      await workflowChat.sendMessage('Hello');
      await workflowChat.page.evaluate(() => {
        const event = new CustomEvent('ws-message', {
          detail: {
            type: 'CHAT_RESPONSE',
            data: {
              content: 'Hello! How can I help you with your workflow?',
              sender: 'assistant'
            }
          }
        });
        window.dispatchEvent(event);
      });
      await expect(workflowChat.messages.filter({ hasText: 'Hello! How can I help' })).toBeVisible();
    });
    test('should disable input when disconnected', async () => {
      await workflowChat.disconnectButton.click();
      await expect(workflowChat.chatInput).toBeDisabled();
      await expect(workflowChat.sendButton).toBeDisabled();
    });
    test('should show appropriate placeholder text', async () => {
      await expect(workflowChat.chatInput).toHaveAttribute('placeholder', /Type a message or DSL command/);
    });
    test('should clear input after sending message', async () => {
      await workflowChat.chatInput.fill('Test message');
      await workflowChat.sendButton.click();
      await expect(workflowChat.chatInput).toHaveValue('');
    });
    test('should send message on Enter key press', async () => {
      const message = 'Test message via Enter key';
      await workflowChat.chatInput.fill(message);
      await workflowChat.chatInput.press('Enter');
      await expect(workflowChat.messages.filter({ hasText: message })).toBeVisible();
    });
    test('should not send message on Shift+Enter', async () => {
      await workflowChat.chatInput.fill('Line 1');
      await workflowChat.chatInput.press('Shift+Enter');
      await workflowChat.chatInput.type('Line 2');
      await expect(workflowChat.chatInput).toHaveValue('Line 1\nLine 2');
    });
  });
  test.describe('DSL Command Processing', () => {
    test.beforeEach(async () => {
      await workflowChat.open();
      await workflowChat.connect();
    });
    test('should identify DSL commands', async () => {
      const dslCommand = 'Create workflow for customer support with sentiment analysis and escalation';
      await workflowChat.sendMessage(dslCommand);
      const dslMessage = workflowChat.messages.filter({ hasText: dslCommand });
      await expect(dslMessage).toHaveClass(/purple/);
    });
    test('should show DSL processing indicator', async () => {
      const dslCommand = 'Build workflow for data processing with validation and transformation';
      await workflowChat.sendMessage(dslCommand);
      await expect(workflowChat.dslProgress).toBeVisible();
      await expect(workflowChat.page.locator('text=Processing DSL command')).toBeVisible();
    });
    test('should display DSL analysis progress', async () => {
      const dslCommand = 'Create trading bot workflow with risk management';
      await workflowChat.sendMessage(dslCommand);
      await workflowChat.page.evaluate(() => {
        const progressEvents = [
          { step: 'parsing', progress: 25, message: 'Parsing DSL command...' },
          { step: 'analysis', progress: 50, message: 'Analyzing required capabilities...' },
          { step: 'matching', progress: 75, message: 'Matching available agents...' },
          { step: 'generation', progress: 100, message: 'Generating workflow...' }
        ];
        progressEvents.forEach((event, index) => {
          setTimeout(() => {
            const customEvent = new CustomEvent('ws-message', {
              detail: {
                type: 'DSL_PROGRESS',
                data: event
              }
            });
            window.dispatchEvent(customEvent);
          }, index * 500);
        });
      });
      await expect(workflowChat.page.locator('text=Parsing DSL command')).toBeVisible();
      await expect(workflowChat.page.locator('text=Analyzing required capabilities')).toBeVisible();
    });
    test('should display DSL analysis result', async () => {
      const dslCommand = 'Create content moderation workflow';
      await workflowChat.sendMessage(dslCommand);
      await workflowChat.page.evaluate(() => {
        const resultEvent = new CustomEvent('ws-message', {
          detail: {
            type: 'DSL_RESULT',
            data: {
              success: true,
              workflowId: 'workflow-123',
              matchedAgents: [
                { id: 'agent-1', name: 'Content Analyzer', capabilities: ['text-analysis'] },
                { id: 'agent-2', name: 'Moderation Bot', capabilities: ['content-filtering'] }
              ],
              requiredSkills: ['text-analysis', 'content-filtering'],
              reasoning: 'Identified content moderation workflow requiring text analysis and filtering capabilities',
              processTime: 1250
            }
          }
        });
        window.dispatchEvent(resultEvent);
      });
      await expect(workflowChat.dslResult).toBeVisible();
      await expect(workflowChat.page.locator('text=Found 2 matching agents')).toBeVisible();
    });
    test('should handle DSL analysis errors', async () => {
      const dslCommand = 'Invalid command that cannot be processed';
      await workflowChat.sendMessage(dslCommand);
      await workflowChat.page.evaluate(() => {
        const errorEvent = new CustomEvent('ws-message', {
          detail: {
            type: 'DSL_RESULT',
            data: {
              success: false,
              error: 'Unable to parse the provided DSL command',
              workflowId: 'workflow-failed'
            }
          }
        });
        window.dispatchEvent(errorEvent);
      });
      await expect(workflowChat.page.locator('text=DSL analysis failed')).toBeVisible();
      await expect(workflowChat.page.locator('text=Unable to parse')).toBeVisible();
    });
    test('should disable input during DSL processing', async () => {
      const dslCommand = 'Create data pipeline workflow';
      await workflowChat.sendMessage(dslCommand);
      await expect(workflowChat.chatInput).toBeDisabled();
      await expect(workflowChat.sendButton).toBeDisabled();
    });
    test('should provide workflow creation options in DSL result', async () => {
      const dslCommand = 'Build e-commerce recommendation engine';
      await workflowChat.sendMessage(dslCommand);
      await workflowChat.page.evaluate(() => {
        const resultEvent = new CustomEvent('ws-message', {
          detail: {
            type: 'DSL_RESULT',
            data: {
              success: true,
              workflowId: 'workflow-ecommerce',
              matchedAgents: [
                { id: 'rec-agent', name: 'Recommendation Engine', capabilities: ['ml-inference'] }
              ],
              workflow: {
                nodes: [
                  { id: 'input', type: 'input', position: { x: 100, y: 100 } },
                  { id: 'rec-engine', type: 'agent', position: { x: 300, y: 100 } },
                  { id: 'output', type: 'output', position: { x: 500, y: 100 } }
                ],
                edges: [
                  { id: 'e1', source: 'input', target: 'rec-engine' },
                  { id: 'e2', source: 'rec-engine', target: 'output' }
                ]
              }
            }
          }
        });
        window.dispatchEvent(resultEvent);
      });
      await expect(workflowChat.page.locator('[data-testid="create-workflow-btn"]')).toBeVisible();
    });
  });
  test.describe('Message Display and Formatting', () => {
    test.beforeEach(async () => {
      await workflowChat.open();
      await workflowChat.connect();
    });
    test('should display messages with timestamps', async () => {
      await workflowChat.sendMessage('Test message');
      const messageTime = workflowChat.page.locator('[data-testid="message-timestamp"]');
      await expect(messageTime).toBeVisible();
    });
    test('should differentiate user and assistant messages', async () => {
      await workflowChat.sendMessage('User message');
      await workflowChat.page.evaluate(() => {
        const event = new CustomEvent('ws-message', {
          detail: {
            type: 'CHAT_RESPONSE',
            data: {
              content: 'Assistant response',
              sender: 'assistant'
            }
          }
        });
        window.dispatchEvent(event);
      });
      const userMessage = workflowChat.page.locator('[data-sender="user"]');
      const assistantMessage = workflowChat.page.locator('[data-sender="assistant"]');
      await expect(userMessage).toBeVisible();
      await expect(assistantMessage).toBeVisible();
      const userBg = await userMessage.evaluate(el => getComputedStyle(el).backgroundColor);
      const assistantBg = await assistantMessage.evaluate(el => getComputedStyle(el).backgroundColor);
      expect(userBg).not.toBe(assistantBg);
    });
    test('should show DSL command indicator', async () => {
      const dslCommand = 'Create workflow with multiple agents';
      await workflowChat.sendMessage(dslCommand);
      await expect(workflowChat.page.locator('[data-testid="dsl-indicator"]')).toBeVisible();
    });
    test('should auto-scroll to latest message', async () => {
      for (let i = 0; i < 10; i++) {
        await workflowChat.sendMessage(`Message ${i + 1}`);
        await workflowChat.page.waitForTimeout(100);
      }
      await expect(workflowChat.page.locator('text=Message 10')).toBeInViewport();
    });
    test('should display system messages differently', async () => {
      await expect(workflowChat.page.locator('[data-type="system"]')).toBeVisible();
      await expect(workflowChat.page.locator('text=Connected to Praxis')).toBeVisible();
    });
  });
  test.describe('Error Handling and Recovery', () => {
    test('should handle WebSocket disconnection', async () => {
      await workflowChat.open();
      await workflowChat.connect();
      await workflowChat.page.evaluate(() => {
        const event = new CustomEvent('ws-error', {
          detail: { message: 'Connection lost' }
        });
        window.dispatchEvent(event);
      });
      await expect(workflowChat.connectionStatus).toContainText('Disconnected');
      await expect(workflowChat.page.locator('text=Connection lost')).toBeVisible();
    });
    test('should handle message send failures', async () => {
      await workflowChat.open();
      await workflowChat.connect();
      await workflowChat.page.route('**/ws', route => {
        route.abort('failed');
      });
      await workflowChat.sendMessage('This message will fail');
      await expect(workflowChat.page.locator('text=Failed to send message')).toBeVisible();
    });
    test('should provide reconnection capability', async () => {
      await workflowChat.open();
      await workflowChat.connect();
      await workflowChat.disconnectButton.click();
      await expect(workflowChat.connectButton).toBeVisible();
      await workflowChat.connect();
      await expect(workflowChat.connectionStatus).toContainText('Connected');
    });
    test('should handle malformed WebSocket messages', async () => {
      await workflowChat.open();
      await workflowChat.connect();
      await workflowChat.page.evaluate(() => {
        const event = new CustomEvent('ws-message', {
          detail: { invalid: 'malformed message structure' }
        });
        window.dispatchEvent(event);
      });
      await expect(workflowChat.chatInput).toBeVisible();
      await expect(workflowChat.sendButton).toBeVisible();
    });
  });
  test.describe('Performance and UX', () => {
    test('should handle rapid message sending', async () => {
      await workflowChat.open();
      await workflowChat.connect();
      for (let i = 0; i < 5; i++) {
        await workflowChat.sendMessage(`Rapid message ${i + 1}`);
      }
      await expect(workflowChat.messages).toHaveCount(6); // 5 messages + welcome message
    });
    test('should maintain chat history during session', async () => {
      await workflowChat.open();
      await workflowChat.connect();
      await workflowChat.sendMessage('First message');
      await workflowChat.sendMessage('Second message');
      await workflowChat.chatToggle.click();
      await workflowChat.chatToggle.click();
      await expect(workflowChat.page.locator('text=First message')).toBeVisible();
      await expect(workflowChat.page.locator('text=Second message')).toBeVisible();
    });
    test('should show typing indicator during DSL processing', async () => {
      await workflowChat.open();
      await workflowChat.connect();
      await workflowChat.sendMessage('Create complex workflow');
      await expect(workflowChat.page.locator('[data-testid="typing-indicator"]')).toBeVisible();
    });
  });
  test.describe('Integration with Workflow Builder', () => {
    test('should create workflow from DSL result', async () => {
      await workflowChat.open();
      await workflowChat.connect();
      const dslCommand = 'Create simple agent workflow';
      await workflowChat.sendMessage(dslCommand);
      await workflowChat.page.evaluate(() => {
        const resultEvent = new CustomEvent('ws-message', {
          detail: {
            type: 'DSL_RESULT',
            data: {
              success: true,
              workflow: {
                nodes: [{ id: 'agent-1', type: 'agent', position: { x: 200, y: 200 } }],
                edges: []
              }
            }
          }
        });
        window.dispatchEvent(resultEvent);
      });
      await workflowChat.page.click('[data-testid="create-workflow-btn"]');
      await helpers.waitForNodeCount(1);
      expect(await helpers.getNodeCount()).toBe(1);
    });
    test('should show workflow creation confirmation', async () => {
      await workflowChat.open();
      await workflowChat.connect();
      await workflowChat.sendMessage('Build data processing pipeline');
      await workflowChat.page.click('[data-testid="create-workflow-btn"]');
      await expect(workflowChat.page.locator('text=Workflow created successfully')).toBeVisible();
    });
  });
});