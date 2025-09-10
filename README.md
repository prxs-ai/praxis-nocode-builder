# Praxis NoCode Builder

A visual no-code workflow builder for the Praxis P2P Agent Network. Create, manage, and execute complex AI workflows through drag-and-drop interface with real-time execution monitoring.

## 🚀 What is Praxis NoCode Builder?

Praxis NoCode Builder is a **visual workflow orchestration platform** that enables users to:
- 🎨 **Create workflows visually** through intuitive drag-and-drop interface
- 🤖 **Design AI agent workflows** with configurable LLM models and prompts
- 🔧 **Connect MCP tools** and agent capabilities seamlessly
- 💬 **Use natural language** to generate workflows via DSL commands
- ⚡ **Monitor execution** in real-time with WebSocket connections
- 📊 **Import/Export workflows** in YAML format for sharing and version control

## ✨ Key Features

- 🎯 **Visual Workflow Builder** - ReactFlow-based canvas for creating complex agent workflows
- 🧠 **AI Agent Integration** - Support for GPT-4, Claude, and other LLM models
- 🔗 **P2P Network Ready** - Designed for Praxis P2P Agent Network integration
- 🛠️ **MCP Tool Support** - Model Context Protocol tools and agent skills
- 💬 **Natural Language DSL** - Create workflows using natural language commands
- ⚡ **Real-time Monitoring** - Live workflow execution tracking via WebSocket
- 📁 **Workflow Management** - Import/export, templates, and workflow library
- 🎨 **Modern UI** - Built with Next.js, React, Tailwind CSS, and shadcn/ui

## 🏃 Quick Start

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/prxs-ai/praxis-nocode-builder
cd praxis-nocode-builder

# Install dependencies
npm install
```

### 2. Environment Setup
Create a `.env.local` file in the root directory:
```bash
# Optional: Backend endpoints (defaults shown)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001/api
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8090/ws/workflow
```

### 3. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Quick Workflow Creation
1. **Visual Builder**: Drag nodes from the library to create workflows
2. **Natural Language**: Type commands like "Create a workflow to analyze text sentiment"
3. **Templates**: Use sample workflows from the library

## 🏗️ Architecture

```
Frontend (Next.js/React) ←→ WebSocket ←→ Praxis P2P Network
         ↑                                      ↓
    ReactFlow Canvas                    Agent Orchestrator
         ↑                                      ↓
   Node Components                         Tool Execution
    (Agent/Tool/Handoff)                       ↓
         ↑                              MCP Protocol Tools
    Configuration Panel
```

**Component Architecture:**
- **Workflow Canvas**: ReactFlow-based visual editor
- **Node System**: Three types - Agent, Tool, and Handoff nodes
- **WebSocket Client**: Real-time communication with backend
- **DSL Processor**: Natural language to workflow conversion
- **Configuration Management**: Node properties and workflow settings

## 📋 Node Types

### 🤖 Agent Nodes
Configure AI agents with:
- **Model Selection**: GPT-4, Claude, etc.
- **System Prompts**: Define agent behavior
- **Temperature & Tokens**: Control creativity and response length
- **Agent Identity**: Name and description

### 🔧 Tool Nodes  
Connect tools and capabilities:
- **MCP Tools**: Model Context Protocol tools
- **Agent Skills**: Built-in agent capabilities
- **Parameter Mapping**: Input/output configuration
- **Data Transformation**: Schema and type handling

### 🔄 Handoff Nodes
Control workflow flow:
- **Completion Handoffs**: Sequential execution
- **Conditional Routing**: Logic-based branching
- **Error Handling**: Fallback mechanisms
- **Context Passing**: Data flow between agents

## 🎛️ Available Commands

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run start        # Start production server
npm run lint         # Run ESLint linting
```

### Testing Commands
```bash
npm test                    # Run all Playwright tests
npm run test:ui             # Run tests with UI mode
npm run test:headed         # Run tests in headed mode
npm run test:debug          # Debug tests interactively

# Specific test suites
npm run test:dsl            # DSL command analysis tests
npm run test:workflow       # Workflow creation tests
npm run test:import-export  # Import/export functionality tests
npm run test:p2p           # Agent discovery P2P tests
npm run test:realtime      # Real-time status updates tests
npm run test:comprehensive # Comprehensive workflow tests
npm run test:full-integration      # Full integration tests
npm run test:integration-headed    # Integration tests in headed mode
npm run test:integration-debug     # Debug integration tests
```

### DSL Commands (Natural Language)
```bash
# Workflow creation examples
"Create a workflow to analyze customer feedback"
"Build a content generation pipeline with review steps" 
"Set up a data processing workflow with error handling"
"Design a multi-agent research and analysis system"
```

## 📊 Backend Integration

### Required Backend Services

**Praxis P2P Agent Network:**
- **Orchestrator Agent**: `http://localhost:8000` - Main workflow coordination
- **Tool Agents**: `http://localhost:8001` - Filesystem and utility tools  
- **WebSocket Server**: `ws://localhost:8090/ws/workflow` - Real-time updates

### API Endpoints
```bash
# Workflow execution
POST /api/workflow/execute  # Execute workflow
GET /api/workflow/status/{id}  # Check workflow status

# Agent discovery
GET /api/agents/discover  # Find available agents
GET /api/agents/capabilities  # List agent capabilities

# Tool management  
GET /api/tools/mcp  # List MCP tools
GET /api/tools/skills  # List agent skills
```

## 🔍 Workflow Features

### Import/Export
- **YAML Format**: Standard workflow serialization
- **Template Library**: Pre-built workflow templates
- **Version Control**: Track workflow changes
- **Sharing**: Export workflows for team collaboration

### Real-time Monitoring
- **Execution Progress**: Live workflow status updates
- **Node Status**: Individual node execution tracking
- **Error Handling**: Real-time error reporting and recovery
- **Performance Metrics**: Execution time and resource usage

### Natural Language Processing
- **DSL Analysis**: Convert natural language to workflows
- **Agent Matching**: Find suitable agents for tasks
- **Tool Discovery**: Identify required tools automatically
- **Workflow Suggestions**: AI-generated workflow recommendations

## 🧪 Testing

The project includes comprehensive Playwright end-to-end tests:

- **Workflow Creation**: Visual builder functionality
- **DSL Processing**: Natural language command analysis  
- **Real-time Updates**: WebSocket communication testing
- **Import/Export**: Workflow serialization testing
- **P2P Integration**: Agent discovery and communication
- **Error Handling**: Failure scenarios and recovery

Run tests with: `npm test` or use specific test suites for targeted testing.

## 🚀 Production Deployment

### Build & Deploy
```bash
# Build production bundle
npm run build

# Start production server
npm start

# Or deploy to Vercel/Netlify
npx vercel deploy
```

### Environment Configuration
```bash
# Production environment variables
NEXT_PUBLIC_API_BASE_URL=https://your-backend.com/api
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-websocket.com/ws/workflow
```

### Backend Requirements
Ensure the Praxis P2P Agent Network is running:
1. Deploy agent orchestrator and tool agents
2. Configure WebSocket server for real-time communication
3. Set up proper CORS configuration for frontend access

## 📚 Documentation

For detailed technical documentation, see:
- `tests/e2e/README.md` - Testing documentation and examples
- Component documentation in respective files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Run the test suite: `npm test`
5. Commit changes: `git commit -m 'Add feature'`
6. Push to branch: `git push origin feature-name`
7. Submit a pull request

### Development Guidelines
- Follow existing code patterns and TypeScript types
- Test new features with Playwright tests
- Ensure WebSocket communication compatibility
- Maintain compatibility with Praxis P2P Agent Network

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Framework**: Tailwind CSS, shadcn/ui, Radix UI
- **Workflow Engine**: ReactFlow for visual workflow creation
- **Real-time Communication**: WebSocket client with reconnection logic
- **Testing**: Playwright for comprehensive E2E testing  
- **State Management**: React hooks and context
- **Build Tools**: Next.js build system, ESLint

## 📄 License

MIT License - see LICENSE file for details.

---

Built with ❤️ for the Praxis P2P Agent Network ecosystem.