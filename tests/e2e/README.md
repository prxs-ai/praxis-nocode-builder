# Praxis AI Workflow E2E Testing Suite

This directory contains comprehensive end-to-end tests for the Praxis AI workflow system, designed to test the complete user journey from UI interaction to backend execution.

## Test Files Overview

### Main Integration Tests

#### `praxis-full-integration.spec.ts`
**Primary comprehensive integration test covering:**
- Navigation to http://localhost:3000
- Complete UI loading verification
- Workflow creation via DSL commands (`CALL write_file hello.txt "Hello from UI test!"`)
- Workflow execution and monitoring
- Backend operation verification
- Screenshot capture at each step
- Error handling and recovery

#### `helpers/backend-monitor.ts`
**Backend monitoring utilities:**
- Docker container log analysis
- P2P communication monitoring
- MCP file operation tracking
- Error detection and logging
- WebSocket activity monitoring
- Comprehensive status reporting

## Test Configuration

### Playwright Configuration (`playwright.config.ts`)
```typescript
- baseURL: http://localhost:3000
- viewport: 1920x1080
- actionTimeout: 15000ms
- navigationTimeout: 45000ms
- screenshot: 'on' (all test steps)
- retries: 3 (CI) / 1 (local)
```

## Running the Tests

### Quick Start
```bash
# Run main integration tests (headless)
npm run test:full-integration

# Run with visible browser
npm run test:integration-headed

# Debug mode (step-by-step)
npm run test:integration-debug

# Using the test runner script
./run-integration-tests.sh
./run-integration-tests.sh headed
./run-integration-tests.sh debug
./run-integration-tests.sh ui
```

### Prerequisites
1. **Backend Services**: Ensure Docker containers are running:
   ```bash
   docker ps --filter "name=praxis"
   ```

2. **Frontend Service**: Application should be accessible at `http://localhost:3000`:
   ```bash
   npm run dev
   ```

3. **Test Dependencies**: Install Playwright browsers if needed:
   ```bash
   npx playwright install
   ```

## Test Structure

### Test Scenarios

#### 1. Complete Workflow Creation and Execution
- **Objective**: Test full user workflow from start to finish
- **Steps**:
  1. Navigate to application
  2. Wait for UI components to load
  3. Open chat interface
  4. Submit DSL command: `CALL write_file hello.txt "Hello from UI test!"`
  5. Verify workflow creation in canvas
  6. Execute workflow
  7. Monitor execution results
  8. Verify backend operations

#### 2. Multiple Node Type Workflows
- **Objective**: Test complex workflows with various node types
- **Steps**:
  1. Load sample workflows
  2. Verify multiple node types are created
  3. Execute complex workflow
  4. Monitor multi-node execution

#### 3. Error Handling and Recovery
- **Objective**: Test system behavior under error conditions
- **Steps**:
  1. Attempt invalid operations
  2. Verify error messages appear
  3. Test recovery mechanisms
  4. Clear and restart workflow

### Backend Monitoring Features

The `BackendMonitor` class provides comprehensive monitoring capabilities:

#### Docker Container Monitoring
```typescript
// Check running containers
await backendMonitor.checkContainerStatus()

// Monitor container logs
await backendMonitor.checkDockerLogs()
```

#### P2P Communication Analysis
```typescript
// Monitor agent discovery and communication
const p2pActivity = await backendMonitor.monitorP2PCommunication()
// Returns: discoveryEvents, connectionEvents, messageEvents
```

#### File Operation Tracking
```typescript
// Monitor MCP file operations
const fileOps = await backendMonitor.checkFileOperations()
// Returns: writeOperations, readOperations, mcpCalls
```

#### Error Detection
```typescript
// Check for system errors
const errors = await backendMonitor.checkForErrors()
// Returns: errors, warnings, criticalIssues
```

## Screenshots and Reporting

### Automatic Screenshots
Tests automatically capture screenshots at key points:
- `01-initial-load.png` - Application startup
- `02-ui-loaded.png` - UI components ready
- `03-dsl-command-sent.png` - After command submission
- `04-workflow-created.png` - Workflow in canvas
- `05-execution-started.png` - Execution begins
- `06-execution-complete.png` - Final state

Screenshots are saved to: `test-results/screenshots/`

### Test Reports
- **HTML Report**: `npm run test:report`
- **JSON Results**: `test-results/results.json`
- **JUnit XML**: `test-results/junit.xml`

## Debugging and Troubleshooting

### Common Issues

#### 1. Frontend Not Accessible
```bash
# Check if service is running on correct port
curl -f -s http://localhost:3000
# Should return HTML content
```

#### 2. Backend Containers Not Running
```bash
# Check Docker containers
docker ps --filter "name=praxis"
# Start if needed
docker-compose up -d
```

#### 3. WebSocket Connection Issues
- Check browser console for WebSocket errors
- Verify backend WebSocket server is accessible
- Check for CORS issues

### Debug Mode
```bash
# Run specific test in debug mode
npx playwright test tests/e2e/praxis-full-integration.spec.ts --debug

# Open Playwright inspector
npx playwright test --ui
```

### Verbose Logging
The tests include extensive console logging for debugging:
- `🚀` - Test start/major steps
- `✅` - Success indicators  
- `⚠️` - Warnings
- `❌` - Errors
- `📸` - Screenshot capture
- `🔧` - Backend monitoring
- `📊` - Status reports

## Extending the Tests

### Adding New Test Cases
1. Create new test in existing spec file:
```typescript
test('New test scenario', async ({ page }) => {
  // Test implementation
})
```

2. Or create new spec file following naming convention:
`feature-name.spec.ts`

### Adding Backend Monitoring
Extend `BackendMonitor` class with new monitoring methods:
```typescript
async monitorNewFeature(): Promise<FeatureStatus> {
  // Monitor new backend feature
  const logs = await this.checkDockerLogs()
  // Analyze and return status
}
```

### Custom Selectors
Update `ui-helper.ts` with new UI element selectors:
```typescript
async newUIInteraction(page: Page) {
  const element = page.locator('[data-testid="new-element"]')
  await element.click()
}
```

## CI/CD Integration

### Environment Variables
- `CI=true` - Enables CI-specific settings
- `BASE_URL` - Override default URL
- `NODE_ENV=test` - Test environment

### GitHub Actions Example
```yaml
- name: Run E2E Tests
  run: |
    npm run test:full-integration
    
- name: Upload Screenshots
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: test-screenshots
    path: test-results/screenshots/
```

## Performance Considerations

### Test Optimization
- Tests run in parallel where possible
- Shared test setup/teardown
- Efficient selector strategies
- Minimal wait times with smart waiting

### Resource Management
- Automatic cleanup after tests
- Memory-efficient log collection
- Screenshot cleanup policies
- Container monitoring limits

## Contributing

When adding new tests:
1. Follow existing naming conventions
2. Include comprehensive logging
3. Add appropriate screenshots
4. Update this documentation
5. Test both success and failure scenarios

## Support

For issues with the test suite:
1. Check console output for detailed error messages
2. Review generated screenshots
3. Examine backend logs via `BackendMonitor`
4. Use debug mode for step-by-step analysis
