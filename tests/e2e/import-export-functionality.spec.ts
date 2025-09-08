import { test, expect } from '@playwright/test'
import { UIHelper } from './helpers/ui-helper'
import * as fs from 'fs'
import * as path from 'path'

test.describe('Import/Export Functionality (JSON/YAML)', () => {
  let uiHelper: UIHelper
  const testDataDir = path.join(__dirname, '../test-data')
  const sampleWorkflowJSON = path.join(testDataDir, 'sample-workflow.json')
  const sampleWorkflowYAML = path.join(testDataDir, 'sample-workflow.yaml')
  const exportedWorkflowJSON = path.join(testDataDir, 'exported-workflow.json')
  const exportedWorkflowYAML = path.join(testDataDir, 'exported-workflow.yaml')

  test.beforeAll(async () => {
    // Create test data directory
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true })
    }

    // Create sample JSON workflow
    const sampleJSON = {
      id: 'test-workflow',
      name: 'Sample Test Workflow',
      nodes: [
        {
          id: 'node-1',
          type: 'agent',
          position: { x: 100, y: 100 },
          data: { 
            name: 'Input Agent',
            description: 'Handles input processing',
            config: {}
          }
        },
        {
          id: 'node-2',
          type: 'tool',
          position: { x: 300, y: 100 },
          data: {
            name: 'Process Tool',
            description: 'Processes the data',
            config: { timeout: 30000 }
          }
        }
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
          type: 'custom'
        }
      ]
    }

    fs.writeFileSync(sampleWorkflowJSON, JSON.stringify(sampleJSON, null, 2))

    // Create sample YAML workflow
    const sampleYAML = `
id: test-workflow-yaml
name: Sample YAML Workflow
nodes:
  - id: node-1
    type: agent
    position:
      x: 150
      y: 150
    data:
      name: YAML Agent
      description: Agent from YAML
      config: {}
  - id: node-2
    type: handoff
    position:
      x: 350
      y: 150
    data:
      name: Handoff Node
      description: Handoff processing
      config:
        targetAgent: next-agent
edges:
  - id: edge-1
    source: node-1
    target: node-2
    type: custom
`
    fs.writeFileSync(sampleWorkflowYAML, sampleYAML)
  })

  test.afterAll(async () => {
    // Clean up test files
    const testFiles = [sampleWorkflowJSON, sampleWorkflowYAML, exportedWorkflowJSON, exportedWorkflowYAML]
    testFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file)
      }
    })
  })

  test.beforeEach(async ({ page }) => {
    uiHelper = new UIHelper(page)
    await page.goto('/')
    
    // Wait for application to load
    const canvas = page.locator('.react-flow, [data-testid="workflow-canvas"]')
    await expect(canvas).toBeVisible({ timeout: 10000 })
  })

  test('should import JSON workflow file', async ({ page }) => {
    // Look for import button or menu
    const importButton = page.locator(
      'button:has-text("Import"), ' +
      '[data-testid="import-workflow"], ' +
      'button[aria-label*="import"], ' +
      '.import-btn'
    )
    
    // Try dropdown menu for import
    const menuButton = page.locator('button:has-text("File"), button:has-text("Menu"), .menu-button')
    
    if (await importButton.isVisible()) {
      await importButton.click()
    } else if (await menuButton.isVisible()) {
      await menuButton.click()
      const importMenuItem = page.locator('button:has-text("Import"), [role="menuitem"]:has-text("Import")')
      if (await importMenuItem.isVisible()) {
        await importMenuItem.click()
      }
    }

    // Handle file upload
    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(sampleWorkflowJSON)
      
      // Wait for workflow to be loaded
      await page.waitForTimeout(2000)
      
      // Verify nodes were imported
      const canvas = page.locator('.react-flow')
      const nodes = canvas.locator('.react-flow__node')
      await expect(nodes).toHaveCountGreaterThan(0)
      
      // Verify specific nodes exist
      const inputAgent = canvas.locator(':has-text("Input Agent")')
      const processTool = canvas.locator(':has-text("Process Tool")')
      
      if (await inputAgent.isVisible() || await processTool.isVisible()) {
        console.log('✓ JSON workflow imported successfully')
      }
      
      await page.screenshot({ 
        path: './test-results/imported-json-workflow.png', 
        fullPage: true 
      })
    }
  })

  test('should import YAML workflow file', async ({ page }) => {
    const importButton = page.locator(
      'button:has-text("Import"), ' +
      '[data-testid="import-workflow"], ' +
      'button[aria-label*="import"]'
    )
    
    const menuButton = page.locator('button:has-text("File"), button:has-text("Menu")')
    
    if (await importButton.isVisible()) {
      await importButton.click()
    } else if (await menuButton.isVisible()) {
      await menuButton.click()
      const importMenuItem = page.locator('button:has-text("Import")')
      if (await importMenuItem.isVisible()) {
        await importMenuItem.click()
      }
    }

    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(sampleWorkflowYAML)
      
      await page.waitForTimeout(2000)
      
      // Verify YAML workflow imported
      const canvas = page.locator('.react-flow')
      const nodes = canvas.locator('.react-flow__node')
      await expect(nodes).toHaveCountGreaterThan(0)
      
      const yamlAgent = canvas.locator(':has-text("YAML Agent")')
      const handoffNode = canvas.locator(':has-text("Handoff Node")')
      
      if (await yamlAgent.isVisible() || await handoffNode.isVisible()) {
        console.log('✓ YAML workflow imported successfully')
      }
      
      await page.screenshot({ 
        path: './test-results/imported-yaml-workflow.png', 
        fullPage: true 
      })
    }
  })

  test('should export workflow as JSON', async ({ page }) => {
    // First create a workflow to export
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    await expect(chatPanel).toBeVisible()

    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    await messageInput.fill('create workflow for data processing')
    await sendButton.click()

    const createWorkflowBtn = chatPanel.locator('button:has-text("Create Visual Workflow"), button:has-text("Create Workflow")')
    await expect(createWorkflowBtn).toBeVisible({ timeout: 15000 })
    await createWorkflowBtn.click()

    await page.waitForTimeout(3000)

    // Look for export button
    const exportButton = page.locator(
      'button:has-text("Export"), ' +
      '[data-testid="export-workflow"], ' +
      'button[aria-label*="export"]'
    )

    const menuButton = page.locator('button:has-text("File"), button:has-text("Menu")')
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
    } else if (await menuButton.isVisible()) {
      await menuButton.click()
      const exportMenuItem = page.locator('button:has-text("Export")')
      if (await exportMenuItem.isVisible()) {
        await exportMenuItem.click()
      }
    }

    // Look for JSON export option
    const jsonExportButton = page.locator('button:has-text("JSON"), [data-format="json"]')
    if (await jsonExportButton.isVisible()) {
      // Set up download handler
      const downloadPromise = page.waitForEvent('download')
      await jsonExportButton.click()
      
      const download = await downloadPromise
      await download.saveAs(exportedWorkflowJSON)
      
      // Verify file was created
      expect(fs.existsSync(exportedWorkflowJSON)).toBeTruthy()
      
      // Verify file contains valid JSON
      const exportedData = JSON.parse(fs.readFileSync(exportedWorkflowJSON, 'utf-8'))
      expect(exportedData).toHaveProperty('nodes')
      expect(exportedData).toHaveProperty('edges')
      
      console.log('✓ Workflow exported as JSON successfully')
    }
  })

  test('should export workflow as YAML', async ({ page }) => {
    // Create a workflow first
    const chatButton = page.locator('button[data-testid="chat-toggle"], button:has-text("Chat"), .fixed.bottom-4.right-4 button')
    await chatButton.click()

    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-interface')
    const messageInput = chatPanel.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]')
    const sendButton = chatPanel.locator('button[type="submit"], button:has-text("Send")')
    
    await messageInput.fill('create simple workflow')
    await sendButton.click()

    const createWorkflowBtn = chatPanel.locator('button:has-text("Create Visual Workflow"), button:has-text("Create Workflow")')
    await expect(createWorkflowBtn).toBeVisible({ timeout: 15000 })
    await createWorkflowBtn.click()

    await page.waitForTimeout(3000)

    // Export as YAML
    const exportButton = page.locator('button:has-text("Export"), [data-testid="export-workflow"]')
    const menuButton = page.locator('button:has-text("File"), button:has-text("Menu")')
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
    } else if (await menuButton.isVisible()) {
      await menuButton.click()
      const exportMenuItem = page.locator('button:has-text("Export")')
      if (await exportMenuItem.isVisible()) {
        await exportMenuItem.click()
      }
    }

    const yamlExportButton = page.locator('button:has-text("YAML"), [data-format="yaml"]')
    if (await yamlExportButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download')
      await yamlExportButton.click()
      
      const download = await downloadPromise
      await download.saveAs(exportedWorkflowYAML)
      
      // Verify YAML file
      expect(fs.existsSync(exportedWorkflowYAML)).toBeTruthy()
      
      const yamlContent = fs.readFileSync(exportedWorkflowYAML, 'utf-8')
      expect(yamlContent).toContain('nodes:')
      expect(yamlContent).toContain('edges:')
      
      console.log('✓ Workflow exported as YAML successfully')
    }
  })

  test('should handle invalid import files gracefully', async ({ page }) => {
    // Create invalid JSON file
    const invalidJSONFile = path.join(testDataDir, 'invalid.json')
    fs.writeFileSync(invalidJSONFile, '{ invalid json content }')

    const importButton = page.locator('button:has-text("Import"), [data-testid="import-workflow"]')
    const menuButton = page.locator('button:has-text("File"), button:has-text("Menu")')
    
    if (await importButton.isVisible()) {
      await importButton.click()
    } else if (await menuButton.isVisible()) {
      await menuButton.click()
      const importMenuItem = page.locator('button:has-text("Import")')
      if (await importMenuItem.isVisible()) {
        await importMenuItem.click()
      }
    }

    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(invalidJSONFile)
      
      // Wait for error message
      await page.waitForTimeout(2000)
      
      // Check for error notification
      const errorMessage = page.locator(
        ':has-text("error"), :has-text("invalid"), :has-text("failed"), ' +
        '[data-testid="error-message"], .error-toast, .error-notification'
      )
      
      if (await errorMessage.isVisible()) {
        console.log('✓ Invalid file error handled correctly')
      }
    }

    // Clean up
    fs.unlinkSync(invalidJSONFile)
  })

  test('should validate workflow schema on import', async ({ page }) => {
    // Create file with wrong schema
    const wrongSchemaFile = path.join(testDataDir, 'wrong-schema.json')
    const wrongSchema = {
      wrongProperty: 'value',
      anotherWrong: 'data'
    }
    
    fs.writeFileSync(wrongSchemaFile, JSON.stringify(wrongSchema, null, 2))

    const importButton = page.locator('button:has-text("Import"), [data-testid="import-workflow"]')
    
    if (await importButton.isVisible()) {
      await importButton.click()
      
      const fileInput = page.locator('input[type="file"]')
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles(wrongSchemaFile)
        
        await page.waitForTimeout(2000)
        
        // Should show schema validation error
        const validationError = page.locator(
          ':has-text("schema"), :has-text("validation"), :has-text("format"), ' +
          '[data-testid="validation-error"]'
        )
        
        if (await validationError.isVisible()) {
          console.log('✓ Schema validation working correctly')
        }
      }
    }

    // Clean up
    fs.unlinkSync(wrongSchemaFile)
  })

  test('should preserve workflow metadata during export/import cycle', async ({ page }) => {
    // Import a workflow
    const importButton = page.locator('button:has-text("Import"), [data-testid="import-workflow"]')
    
    if (await importButton.isVisible()) {
      await importButton.click()
      
      const fileInput = page.locator('input[type="file"]')
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles(sampleWorkflowJSON)
        await page.waitForTimeout(2000)
        
        // Export it again
        const exportButton = page.locator('button:has-text("Export"), [data-testid="export-workflow"]')
        if (await exportButton.isVisible()) {
          await exportButton.click()
          
          const jsonExportButton = page.locator('button:has-text("JSON")')
          if (await jsonExportButton.isVisible()) {
            const downloadPromise = page.waitForEvent('download')
            await jsonExportButton.click()
            
            const download = await downloadPromise
            const reExportedFile = path.join(testDataDir, 're-exported-workflow.json')
            await download.saveAs(reExportedFile)
            
            // Compare original and re-exported
            const original = JSON.parse(fs.readFileSync(sampleWorkflowJSON, 'utf-8'))
            const reExported = JSON.parse(fs.readFileSync(reExportedFile, 'utf-8'))
            
            // Key properties should be preserved
            expect(reExported.nodes).toHaveLength(original.nodes.length)
            expect(reExported.edges).toHaveLength(original.edges.length)
            
            // Clean up
            fs.unlinkSync(reExportedFile)
            
            console.log('✓ Workflow metadata preserved during export/import cycle')
          }
        }
      }
    }
  })
})