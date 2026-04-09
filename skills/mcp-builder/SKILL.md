---
name: mcp-builder
description: Build MCP (Model Context Protocol) servers to connect AI agents to external tools, APIs, databases, and services. Use when creating a new integration that lets an AI agent call external services, or when the user wants to add a new capability/tool to their AI setup.
category: ai-infrastructure
status: working
source: anthropics/skills (adapted)
metadata:
  version: "1.0"
---

## MCP Server Builder

MCP (Model Context Protocol) is the standard for connecting AI agents to external tools. Build an MCP server = give any agent access to any API/service.

### Preferred stack
- **Language**: TypeScript (best SDK support)
- **Transport**: Streamable HTTP (remote) or stdio (local)

### Quick start
```bash
npm create mcp-server@latest my-server
cd my-server
npm install
```

### Minimal TypeScript MCP server
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server({ name: "my-server", version: "1.0.0" }, {
  capabilities: { tools: {} }
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "get_weather",
    description: "Get current weather for a city",
    inputSchema: {
      type: "object",
      properties: { city: { type: "string", description: "City name" } },
      required: ["city"]
    }
  }]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_weather") {
    const city = request.params.arguments?.city as string;
    // call your API here
    return { content: [{ type: "text", text: `Weather in ${city}: 25°C sunny` }] };
  }
  throw new Error(`Unknown tool: ${request.params.name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

## 4-Phase Development Process
1. **Research & Plan** — understand the target API, decide which tools to expose
2. **Implement** — build tools with clear names, proper input schemas, good error messages
3. **Review & Test** — use MCP Inspector to validate, ensure consistent error handling
4. **Create Evals** — write 10 realistic test questions that exercise your tools

## Tool Design Rules
- Tool names: `verb_noun` format (e.g. `get_user`, `create_post`, `search_files`)
- Descriptions: explain WHAT it does AND WHEN to use it
- Error messages must guide toward solutions: "API key missing — set GITHUB_TOKEN env var"
- Return focused, relevant data — not entire API responses
- Support pagination for list endpoints

## Connect to Intelligence360
Add to `~/.intelligence360.env`:
```bash
# then restart intelligence360
```
Or use `/mcp` slash command inside Intelligence360.
