# SSE Transport Guide for FastMCP

## Overview

FastMCP supports Server-Sent Events (SSE) transport for HTTP-based MCP connections. This guide explains how to set up and use SSE transport with your FastMCP server.

## Basic SSE Transport Setup

### 1. Configure FastMCP with SSE Transport

```typescript
import { FastMCP } from 'fastmcp';
import express from 'express';
import { TransportFactory } from 'fastmcp/transport';

const app = express();
app.use(express.json());

const server = new FastMCP({
  name: 'my-sse-server',
  version: '1.0.0',
  transport: {
    type: 'sse',
    port: 3000,
    host: 'localhost'
  }
});

// Register your services
server.register(new MyServerClass());
```

### 2. Set Up HTTP Server with SSE Endpoints

```typescript
const transports: { [sessionId: string]: any } = {};

// Connection endpoint
app.get('/connect', async (req, res) => {
  console.log('SSE connection request received');
  
  const transport = TransportFactory.createSSETransport('/messages', res);
  transports[transport.sessionId] = transport;
  
  res.on('close', () => {
    console.log('SSE connection closed');
    delete transports[transport.sessionId];
  });
  
  await server.getServer().connect(transport);
});

// Message handling endpoint
app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  
  if (!sessionId || !transports[sessionId]) {
    res.status(400).json({ error: 'Invalid session ID' });
    return;
  }
  
  const transport = transports[sessionId];
  await transport.handlePostMessage(req, res, req.body);
});

// Start HTTP server
app.listen(3000, () => {
  console.log('FastMCP SSE server running on http://localhost:3000');
});
```

## Complete Example

```typescript
import { FastMCP, tool, Schema } from 'fastmcp';
import express from 'express';
import { TransportFactory } from 'fastmcp/transport';

// Define your MCP server class
class CalculatorServer {
  @tool({
    name: 'add',
    description: 'Add two numbers',
    inputSchema: Schema.object({
      a: Schema.number(),
      b: Schema.number()
    })
  })
  async add(args: { a: number; b: number }) {
    return {
      content: [{ type: 'text', text: `Result: ${args.a + args.b}` }]
    };
  }
}

// Create FastMCP instance
const mcpServer = new FastMCP({
  name: 'calculator-sse-server',
  version: '1.0.0',
  transport: {
    type: 'sse',
    port: 3000,
    host: 'localhost'
  }
});

mcpServer.register(new CalculatorServer());

// Set up Express server
const app = express();
app.use(express.json());

const transports: { [sessionId: string]: any } = {};

app.get('/connect', async (req, res) => {
  const transport = TransportFactory.createSSETransport('/messages', res);
  transports[transport.sessionId] = transport;
  
  res.on('close', () => {
    delete transports[transport.sessionId];
  });
  
  await mcpServer.getServer().connect(transport);
});

app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  
  if (!transport) {
    res.status(400).json({ error: 'Invalid session ID' });
    return;
  }
  
  await transport.handlePostMessage(req, res, req.body);
});

app.listen(3000, () => {
  console.log('Calculator SSE server running on http://localhost:3000/connect');
});
```

## Client Connection

To connect to your SSE server, clients should:

1. Send a GET request to `/connect` to establish the SSE connection
2. Use the returned session ID for subsequent message requests
3. Send JSON-RPC messages to `/messages?sessionId=<session_id>`

## Important Notes

1. **HTTP Server Required**: SSE transport requires an HTTP server setup, unlike stdio transport which works directly.

2. **Session Management**: Each SSE connection creates a unique session that must be managed properly.

3. **Error Handling**: Implement proper error handling for connection failures and session timeouts.

4. **CORS**: If serving web clients, configure CORS appropriately:

```typescript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
```

## Troubleshooting

- **"SSE connection not established"**: Ensure the connection endpoint is called before sending messages
- **Session not found**: Check that session IDs are properly managed and not expired
- **CORS errors**: Configure appropriate CORS headers for web clients

For more examples, see the `/examples` directory in the FastMCP repository.