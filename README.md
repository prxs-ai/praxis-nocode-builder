# Praxis Frontend

A React/Next.js frontend for the Praxis P2P Agent Network that provides visual workflow building and real-time execution monitoring.

## Features

- 🎨 **Visual Workflow Builder** - Drag-and-drop interface using ReactFlow
- 🔄 **Real-time Execution** - Live progress tracking via WebSocket
- 💬 **Natural Language Support** - Convert text to executable workflows
- 🔧 **Node Types** - Input, Process, Conditional, Code, and Output nodes
- 📊 **Live Monitoring** - Real-time agent status and execution results

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 3. Connect to Backend

Ensure the Praxis agents are running on:

- Agent-1: `http://localhost:8000` (Orchestrator)
- Agent-2: `http://localhost:8001` (Filesystem)

## Configuration

The frontend automatically connects to:

- **HTTP API**: `http://localhost:8000`
- **WebSocket**: `ws://localhost:9100`

To change these endpoints, modify `lib/api-client.ts` and `lib/websocket-client.ts`.

## Project Structure

```
├── app/                 # Next.js app router
├── components/          # React components
│   ├── nodes/          # Workflow node components
│   └── ui/             # UI component library
├── lib/                # Utilities and API clients
└── public/             # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run Playwright tests

## Usage

1. **Create Workflow**: Drag nodes from the library to build your workflow
2. **Configure Nodes**: Click nodes to set their parameters and connections
3. **Execute**: Click "Execute Workflow" to run on the P2P network
4. **Monitor**: Watch real-time progress and results in the execution panel

## Node Types

- **Input**: Workflow entry points and data sources
- **Process**: Data transformation and business logic
- **Conditional**: Decision branching based on conditions
- **Code**: Custom code execution capabilities
- **Output**: Results display and data export

## Dependencies

- **Next.js 14** - React framework
- **ReactFlow** - Visual workflow builder
- **Tailwind CSS** - Styling
- **Shadcn/ui** - Component library
- **Lucide React** - Icons
