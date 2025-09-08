import { test, expect } from '@playwright/test';
import { TestHelpers, WorkflowBuilderPage } from './utils/test-helpers';
test.describe('WorkflowBuilder Component', () => {
  let helpers: TestHelpers;
  let workflowBuilder: WorkflowBuilderPage;
  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    workflowBuilder = new WorkflowBuilderPage(page, helpers);
    await helpers.mockAPIEndpoints();
    await workflowBuilder.goto();
  });
  test.describe('Basic UI Elements', () => {
    test('should display the main application title', async () => {
      await expect(workflowBuilder.page.locator('text=PRAXIS')).toBeVisible();
    });
    test('should display node library', async () => {
      await expect(workflowBuilder.nodeLibrary).toBeVisible();
      await expect(workflowBuilder.page.locator('text=Node Library')).toBeVisible();
    });
    test('should display React Flow canvas', async () => {
      await expect(workflowBuilder.canvas).toBeVisible();
      await expect(workflowBuilder.page.locator('.react-flow__renderer')).toBeVisible();
    });
    test('should display control buttons', async () => {
      await expect(workflowBuilder.saveButton).toBeVisible();
      await expect(workflowBuilder.loadButton).toBeVisible();
      await expect(workflowBuilder.executeButton).toBeVisible();
      await expect(workflowBuilder.validateButton).toBeVisible();
      await expect(workflowBuilder.clearButton).toBeVisible();
    });
    test('should display React Flow controls and minimap', async () => {
      await expect(workflowBuilder.page.locator('.react-flow__controls')).toBeVisible();
      await expect(workflowBuilder.page.locator('.react-flow__minimap')).toBeVisible();
    });
  });
  test.describe('Node Creation and Management', () => {
    test('should create agent node via drag and drop', async () => {
      const initialNodeCount = await helpers.getNodeCount();
      await helpers.createNode('agent', { x: 300, y: 200 });
      const finalNodeCount = await helpers.getNodeCount();
      expect(finalNodeCount).toBe(initialNodeCount + 1);
      await expect(workflowBuilder.page.locator('[data-testid^="react-flow__node-agent"]')).toBeVisible();
    });
    test('should create tool node via drag and drop', async () => {
      const initialNodeCount = await helpers.getNodeCount();
      await helpers.createNode('tool', { x: 400, y: 300 });
      const finalNodeCount = await helpers.getNodeCount();
      expect(finalNodeCount).toBe(initialNodeCount + 1);
      await expect(workflowBuilder.page.locator('[data-testid^="react-flow__node-tool"]')).toBeVisible();
    });
    test('should create handoff node via drag and drop', async () => {
      const initialNodeCount = await helpers.getNodeCount();
      await helpers.createNode('handoff', { x: 500, y: 400 });
      const finalNodeCount = await helpers.getNodeCount();
      expect(finalNodeCount).toBe(initialNodeCount + 1);
      await expect(workflowBuilder.page.locator('[data-testid^="react-flow__node-handoff"]')).toBeVisible();
    });
    test('should create multiple nodes of different types', async () => {
      const initialNodeCount = await helpers.getNodeCount();
      await helpers.createNode('agent', { x: 200, y: 100 });
      await helpers.createNode('tool', { x: 400, y: 100 });
      await helpers.createNode('handoff', { x: 600, y: 100 });
      const finalNodeCount = await helpers.getNodeCount();
      expect(finalNodeCount).toBe(initialNodeCount + 3);
    });
    test('should select node when clicked', async () => {
      await helpers.createNode('agent', { x: 300, y: 200 });
      const agentNode = workflowBuilder.page.locator('[data-testid^="react-flow__node-agent"]').first();
      const nodeId = await agentNode.getAttribute('data-id');
      await helpers.selectNode(nodeId!);
      await expect(workflowBuilder.configPanel).toBeVisible();
    });
    test('should update node configuration', async () => {
      await helpers.createNode('agent', { x: 300, y: 200 });
      const agentNode = workflowBuilder.page.locator('[data-testid^="react-flow__node-agent"]').first();
      const nodeId = await agentNode.getAttribute('data-id');
      await helpers.selectNode(nodeId!);
      await helpers.updateNodeConfig({
        label: 'Test Agent',
        description: 'A test agent for demo purposes'
      });
      await expect(workflowBuilder.page.locator(`[data-testid="node-config-label"]`)).toHaveValue('Test Agent');
    });
  });
  test.describe('Edge Creation and Management', () => {
    test('should create edge between two nodes', async () => {
      await helpers.createNode('agent', { x: 200, y: 200 });
      await helpers.createNode('tool', { x: 500, y: 200 });
      const agentNode = workflowBuilder.page.locator('[data-testid^="react-flow__node-agent"]').first();
      const toolNode = workflowBuilder.page.locator('[data-testid^="react-flow__node-tool"]').first();
      const agentId = await agentNode.getAttribute('data-id');
      const toolId = await toolNode.getAttribute('data-id');
      const initialEdgeCount = await helpers.getEdgeCount();
      await helpers.connectNodes(agentId!, toolId!);
      const finalEdgeCount = await helpers.getEdgeCount();
      expect(finalEdgeCount).toBe(initialEdgeCount + 1);
    });
    test('should create multiple edges in a workflow', async () => {
      await helpers.createNode('agent', { x: 100, y: 200 });
      await helpers.createNode('tool', { x: 300, y: 200 });
      await helpers.createNode('handoff', { x: 500, y: 200 });
      const nodes = await workflowBuilder.page.locator('.react-flow__node').all();
      const nodeIds = await Promise.all(nodes.map(node => node.getAttribute('data-id')));
      const initialEdgeCount = await helpers.getEdgeCount();
      await helpers.connectNodes(nodeIds[0]!, nodeIds[1]!);
      await helpers.connectNodes(nodeIds[1]!, nodeIds[2]!);
      const finalEdgeCount = await helpers.getEdgeCount();
      expect(finalEdgeCount).toBe(initialEdgeCount + 2);
    });
  });
  test.describe('Workflow Operations', () => {
    test('should save workflow to localStorage', async () => {
      await helpers.createNode('agent', { x: 200, y: 200 });
      await helpers.createNode('tool', { x: 400, y: 200 });
      await helpers.saveWorkflow();
      await expect(workflowBuilder.page.locator('[data-testid="toast"]')).toContainText('Workflow saved');
    });
    test('should load workflow from localStorage', async () => {
      await helpers.createNode('agent', { x: 200, y: 200 });
      await helpers.saveWorkflow();
      await helpers.clearCanvas();
      expect(await helpers.getNodeCount()).toBe(0);
      await helpers.loadWorkflow();
      await helpers.waitForNodeCount(1);
      expect(await helpers.getNodeCount()).toBe(1);
    });
    test('should load sample workflow', async () => {
      const initialNodeCount = await helpers.getNodeCount();
      await helpers.loadSampleWorkflow('customerSupport');
      await workflowBuilder.page.waitForTimeout(1000);
      const finalNodeCount = await helpers.getNodeCount();
      expect(finalNodeCount).toBeGreaterThan(initialNodeCount);
    });
    test('should clear canvas', async () => {
      await helpers.createNode('agent', { x: 200, y: 200 });
      await helpers.createNode('tool', { x: 400, y: 200 });
      expect(await helpers.getNodeCount()).toBe(2);
      await helpers.clearCanvas();
      expect(await helpers.getNodeCount()).toBe(0);
    });
  });
  test.describe('Workflow Validation', () => {
    test('should validate empty workflow', async () => {
      await helpers.validateWorkflow();
      await expect(workflowBuilder.page.locator('[data-testid="validation-panel"]')).toBeVisible();
    });
    test('should validate workflow with nodes but no connections', async () => {
      await helpers.createNode('agent', { x: 200, y: 200 });
      await helpers.createNode('tool', { x: 400, y: 200 });
      await helpers.validateWorkflow();
      await expect(workflowBuilder.page.locator('[data-testid="validation-panel"]')).toBeVisible();
      const errors = await helpers.getValidationErrors();
      expect(errors.some(error => error.includes('disconnected'))).toBeTruthy();
    });
    test('should validate connected workflow', async () => {
      await helpers.createNode('agent', { x: 200, y: 200 });
      await helpers.createNode('tool', { x: 400, y: 200 });
      const nodes = await workflowBuilder.page.locator('.react-flow__node').all();
      const nodeIds = await Promise.all(nodes.map(node => node.getAttribute('data-id')));
      await helpers.connectNodes(nodeIds[0]!, nodeIds[1]!);
      await helpers.validateWorkflow();
      expect(await helpers.isValidationPassed()).toBeTruthy();
    });
  });
  test.describe('Workflow Execution', () => {
    test('should prevent execution of empty workflow', async () => {
      await workflowBuilder.executeButton.click();
      await expect(workflowBuilder.page.locator('[data-testid="toast"]')).toContainText('Nothing to execute');
    });
    test('should execute valid workflow', async () => {
      await helpers.createNode('agent', { x: 200, y: 200 });
      await helpers.createNode('tool', { x: 400, y: 200 });
      const nodes = await workflowBuilder.page.locator('.react-flow__node').all();
      const nodeIds = await Promise.all(nodes.map(node => node.getAttribute('data-id')));
      await helpers.connectNodes(nodeIds[0]!, nodeIds[1]!);
      await helpers.executeWorkflow();
      await expect(workflowBuilder.executionProgress).toBeVisible();
    });
    test('should show execution logs during workflow execution', async () => {
      await helpers.createNode('agent', { x: 200, y: 200 });
      await helpers.executeWorkflow();
      await expect(workflowBuilder.executionLogs).toBeVisible();
      const logs = await helpers.getExecutionLogs();
      expect(logs.length).toBeGreaterThan(0);
    });
    test('should stop workflow execution', async () => {
      await helpers.createNode('agent', { x: 200, y: 200 });
      await helpers.executeWorkflow();
      await helpers.stopWorkflowExecution();
      await expect(workflowBuilder.page.locator('[data-testid="execution-status"][data-status="cancelled"]')).toBeVisible();
    });
  });
  test.describe('Real-time Visual Updates', () => {
    test('should update node status during execution', async () => {
      await helpers.createNode('agent', { x: 200, y: 200 });
      await helpers.executeWorkflow();
      await workflowBuilder.page.waitForSelector('[data-status="running"]', { timeout: 10000 });
      await workflowBuilder.page.waitForSelector('[data-status="success"]', { timeout: 30000 });
    });
    test('should animate edges during data flow', async () => {
      await helpers.createNode('agent', { x: 200, y: 200 });
      await helpers.createNode('tool', { x: 400, y: 200 });
      const nodes = await workflowBuilder.page.locator('.react-flow__node').all();
      const nodeIds = await Promise.all(nodes.map(node => node.getAttribute('data-id')));
      await helpers.connectNodes(nodeIds[0]!, nodeIds[1]!);
      await helpers.executeWorkflow();
      await workflowBuilder.page.waitForSelector('.react-flow__edge[data-animated="true"]', { timeout: 15000 });
    });
  });
  test.describe('Error Handling', () => {
    test('should handle network failures gracefully', async () => {
      await helpers.createNode('agent', { x: 200, y: 200 });
      await helpers.simulateNetworkFailure();
      await helpers.executeWorkflow();
      await expect(workflowBuilder.page.locator('[data-testid="toast"]')).toContainText('failed');
      await helpers.restoreNetworkConnection();
    });
    test('should recover from temporary connection issues', async () => {
      await helpers.createNode('agent', { x: 200, y: 200 });
      await helpers.simulateNetworkFailure();
      await workflowBuilder.page.waitForTimeout(2000);
      await helpers.restoreNetworkConnection();
      await helpers.executeWorkflow();
      await expect(workflowBuilder.executionProgress).toBeVisible();
    });
  });
  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(workflowBuilder.page.locator('text=PRAXIS')).toBeVisible();
      await expect(workflowBuilder.nodeLibrary).toBeVisible();
      await expect(workflowBuilder.canvas).toBeVisible();
    });
    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(workflowBuilder.nodeLibrary).toBeVisible();
      await expect(workflowBuilder.canvas).toBeVisible();
      await expect(workflowBuilder.saveButton).toBeVisible();
    });
  });
  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async () => {
      await expect(workflowBuilder.saveButton).toHaveAttribute('aria-label');
      await expect(workflowBuilder.executeButton).toHaveAttribute('aria-label');
    });
    test('should support keyboard navigation', async () => {
      await workflowBuilder.page.keyboard.press('Tab');
      await workflowBuilder.page.keyboard.press('Tab');
      await workflowBuilder.page.keyboard.press('Tab');
      const focusedElement = await workflowBuilder.page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
    test('should have sufficient color contrast', async () => {
      await expect(workflowBuilder.page.locator('text=Node Library')).toBeVisible();
      await expect(workflowBuilder.page.locator('text=PRAXIS')).toBeVisible();
    });
  });
});