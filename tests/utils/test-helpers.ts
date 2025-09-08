import { Page, Locator, expect } from '@playwright/test';
export class TestHelpers {
  constructor(public readonly page: Page) {}
  async waitForAppReady() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('[data-testid="app-ready"]', { timeout: 30000 });
  }
  async waitForReactFlowReady() {
    await this.page.waitForSelector('.react-flow', { timeout: 30000 });
    await this.page.waitForFunction(() => {
      const reactFlow = document.querySelector('.react-flow');
      return reactFlow && reactFlow.querySelector('.react-flow__renderer');
    });
  }
  async waitForWebSocketConnection() {
    await this.page.waitForSelector('[data-testid="ws-status"][data-status="connected"]', { 
      timeout: 30000 
    });
  }
  async createNode(nodeType: 'agent' | 'tool' | 'handoff', position: { x: number; y: number }) {
    const nodeLibraryItem = this.page.locator(`[data-testid="node-library-${nodeType}"]`);
    const canvas = this.page.locator('.react-flow__renderer');
    await nodeLibraryItem.dragTo(canvas, {
      targetPosition: position
    });
    await this.page.waitForSelector(`[data-testid^="react-flow__node-${nodeType}"]`);
  }
  async connectNodes(sourceNodeId: string, targetNodeId: string) {
    const sourceHandle = this.page.locator(`[data-testid="react-flow__node-${sourceNodeId}"] .react-flow__handle-right`);
    const targetHandle = this.page.locator(`[data-testid="react-flow__node-${targetNodeId}"] .react-flow__handle-left`);
    await sourceHandle.dragTo(targetHandle);
    await this.page.waitForSelector('.react-flow__edge');
  }
  async selectNode(nodeId: string) {
    await this.page.click(`[data-testid="react-flow__node-${nodeId}"]`);
    await this.page.waitForSelector('[data-testid="node-config-panel"]');
  }
  async updateNodeConfig(config: Record<string, string>) {
    for (const [field, value] of Object.entries(config)) {
      const input = this.page.locator(`[data-testid="node-config-${field}"]`);
      await input.fill(value);
    }
  }
  async saveWorkflow() {
    await this.page.click('[data-testid="save-workflow-btn"]');
    await this.page.waitForSelector('[data-testid="toast-success"]');
  }
  async loadWorkflow() {
    await this.page.click('[data-testid="load-workflow-btn"]');
    await this.page.waitForSelector('[data-testid="toast-success"]');
  }
  async loadSampleWorkflow(workflowName: string) {
    await this.page.click('[data-testid="samples-dropdown"]');
    await this.page.click(`[data-testid="sample-${workflowName}"]`);
    await this.page.waitForSelector('[data-testid="toast-success"]');
  }
  async clearCanvas() {
    await this.page.click('[data-testid="clear-canvas-btn"]');
    await this.page.waitForSelector('[data-testid="toast-success"]');
  }
  async validateWorkflow() {
    await this.page.click('[data-testid="validate-workflow-btn"]');
    await this.page.waitForSelector('[data-testid="validation-panel"]');
  }
  async executeWorkflow() {
    await this.page.click('[data-testid="execute-workflow-btn"]');
    await this.page.waitForSelector('[data-testid="execution-progress"]');
  }
  async stopWorkflowExecution() {
    await this.page.click('[data-testid="stop-workflow-btn"]');
    await this.page.waitForSelector('[data-testid="execution-status"][data-status="cancelled"]');
  }
  async openChat() {
    await this.page.click('[data-testid="chat-toggle-btn"]');
    await this.page.waitForSelector('[data-testid="workflow-chat"]');
  }
  async sendChatMessage(message: string) {
    const input = this.page.locator('[data-testid="chat-input"]');
    await input.fill(message);
    await this.page.click('[data-testid="chat-send-btn"]');
  }
  async sendDSLCommand(command: string) {
    await this.sendChatMessage(command);
    await this.page.waitForSelector('[data-testid="dsl-progress"]');
  }
  async waitForDSLComplete() {
    await this.page.waitForSelector('[data-testid="dsl-result"]', { timeout: 60000 });
  }
  async getNodeCount(): Promise<number> {
    const nodes = await this.page.locator('.react-flow__node').count();
    return nodes;
  }
  async getEdgeCount(): Promise<number> {
    const edges = await this.page.locator('.react-flow__edge').count();
    return edges;
  }
  async waitForNodeCount(expectedCount: number) {
    await this.page.waitForFunction(
      count => document.querySelectorAll('.react-flow__node').length === count,
      expectedCount
    );
  }
  async isValidationPassed(): Promise<boolean> {
    const validationButton = this.page.locator('[data-testid="validate-workflow-btn"]');
    const classes = await validationButton.getAttribute('class');
    return classes?.includes('border-green-500') || false;
  }
  async getValidationErrors(): Promise<string[]> {
    const errors = await this.page.locator('[data-testid="validation-error"]').allTextContents();
    return errors;
  }
  async getExecutionLogs(): Promise<string[]> {
    const logs = await this.page.locator('[data-testid="execution-log"]').allTextContents();
    return logs;
  }
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }
  async mockWebSocketResponses() {
    await this.page.route('**/ws', route => {
      route.fulfill({
        status: 200,
        headers: { 'upgrade': 'websocket' }
      });
    });
  }
  async mockAPIEndpoints() {
    await this.page.route('**/api/workflows/execute', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          executionId: 'test-execution-123',
          workflowId: 'test-workflow-123',
          estimatedDuration: 5000
        })
      });
    });
    await this.page.route('**/api/workflows/validate', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isValid: true,
          errors: [],
          warnings: []
        })
      });
    });
  }
  async simulateNetworkFailure() {
    await this.page.route('**
  async restoreNetworkConnection() {
    await this.page.unrouteAll();
  }
}
export class WorkflowBuilderPage {
  constructor(public readonly page: Page, public readonly helpers: TestHelpers) {}
  get nodeLibrary() { return this.page.locator('[data-testid="node-library"]'); }
  get canvas() { return this.page.locator('.react-flow'); }
  get configPanel() { return this.page.locator('[data-testid="node-config-panel"]'); }
  get saveButton() { return this.page.locator('[data-testid="save-workflow-btn"]'); }
  get loadButton() { return this.page.locator('[data-testid="load-workflow-btn"]'); }
  get executeButton() { return this.page.locator('[data-testid="execute-workflow-btn"]'); }
  get validateButton() { return this.page.locator('[data-testid="validate-workflow-btn"]'); }
  get clearButton() { return this.page.locator('[data-testid="clear-canvas-btn"]'); }
  get executionProgress() { return this.page.locator('[data-testid="execution-progress"]'); }
  get executionLogs() { return this.page.locator('[data-testid="execution-logs"]'); }
  async goto() {
    await this.page.goto('/');
    await this.helpers.waitForAppReady();
    await this.helpers.waitForReactFlowReady();
  }
}
export class WorkflowChatPage {
  constructor(public readonly page: Page, public readonly helpers: TestHelpers) {}
  get chatToggle() { return this.page.locator('[data-testid="chat-toggle-btn"]'); }
  get chatPanel() { return this.page.locator('[data-testid="workflow-chat"]'); }
  get chatInput() { return this.page.locator('[data-testid="chat-input"]'); }
  get sendButton() { return this.page.locator('[data-testid="chat-send-btn"]'); }
  get connectButton() { return this.page.locator('[data-testid="chat-connect-btn"]'); }
  get disconnectButton() { return this.page.locator('[data-testid="chat-disconnect-btn"]'); }
  get connectionStatus() { return this.page.locator('[data-testid="chat-connection-status"]'); }
  get messages() { return this.page.locator('[data-testid="chat-message"]'); }
  get dslProgress() { return this.page.locator('[data-testid="dsl-progress"]'); }
  get dslResult() { return this.page.locator('[data-testid="dsl-result"]'); }
  async open() {
    await this.chatToggle.click();
    await this.chatPanel.waitFor({ state: 'visible' });
  }
  async connect() {
    await this.connectButton.click();
    await this.page.waitForSelector('[data-testid="chat-connection-status"][data-status="connected"]');
  }
  async sendMessage(message: string) {
    await this.chatInput.fill(message);
    await this.sendButton.click();
  }
}