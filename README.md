# FastMCP JavaScript

A fast and simple Model Context Protocol (MCP) server implementation for JavaScript/TypeScript.

## Features

- 🚀 **Easy-to-use decorators** for defining tools, resources, and prompts
- 🔒 **Built-in validation** with Zod schemas
- 📘 **Full TypeScript support** with type safety
- 🔌 **Multiple transport layers** (stdio, SSE)
- 📚 **Comprehensive examples** and documentation
- 🧪 **Well-tested** with Jest test suite

## Installation

```bash
npm install fastmcp
# or
pnpm add fastmcp
# or
yarn add fastmcp
```

## Quick Start

```typescript
import { FastMCP, tool } from 'fastmcp';
import { z } from 'zod';

class MyServer {
  @tool({
    name: 'calculate',
    description: 'Perform basic arithmetic operations',
    inputSchema: Schema.object({
      operation: Schema.enum(['add', 'subtract', 'multiply', 'divide']),
      a: Schema.number(),
      b: Schema.number()
    })
  })
  async calculate(args: { operation: string; a: number; b: number }) {
    const { operation, a, b } = args;
    let result: number;
    
    switch (operation) {
      case 'add': result = a + b; break;
      case 'subtract': result = a - b; break;
      case 'multiply': result = a * b; break;
      case 'divide': 
        if (b === 0) throw new Error('Division by zero');
        result = a / b; 
        break;
      default: throw new Error(`Unknown operation: ${operation}`);
    }
    
    return {
      content: [{ type: 'text', text: `Result: ${result}` }]
    };
  }

  @resource({
    uri: 'memory://data',
    name: 'Memory Data',
    description: 'Access stored data in memory'
  })
  async getMemoryData() {
    return {
      contents: [{
        uri: 'memory://data',
        mimeType: 'application/json',
        text: JSON.stringify({ message: 'Hello from memory!' })
      }]
    };
  }

  @prompt({
    name: 'code_review',
    description: 'Generate a code review prompt',
    arguments: [{
      name: 'code',
      description: 'The code to review',
      required: true
    }]
  })
  async codeReview(args: { code: string }) {
    return {
      description: 'Code review prompt',
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Please review this code and provide feedback:\n\n${args.code}`
        }
      }]
    };
  }
}

// Create and run the server
const server = new FastMCP({
  name: 'my-server',
  version: '1.0.0'
});

server.register(new MyServer());
server.run();
```

## CLI Usage

FastMCP comes with a built-in CLI for running example servers:

```bash
# List available example servers
fastmcp list

# Run the calculator example
fastmcp run --server calculator

# Run with custom options
fastmcp run --server filesystem --transport stdio --log-level debug

# Run on HTTP transport
fastmcp run --server comprehensive --transport http --port 3000
```

### CLI Options

- `--server <type>`: Server type (calculator, filesystem, prompts, comprehensive)
- `--transport <type>`: Transport type (stdio, http, websocket)
- `--port <port>`: Port for HTTP/WebSocket (default: 3000)
- `--host <host>`: Host for HTTP/WebSocket (default: localhost)
- `--log-level <level>`: Log level (error, warn, info, debug)
- `--log-format <format>`: Log format (simple, json)

## API Reference

### Decorators

#### `@tool(options)`

Define a tool that can be called by MCP clients.

```typescript
@tool({
  name: 'tool_name',
  description: 'Tool description',
  inputSchema: Schema.object({
    param: Schema.string()
  })
})
async myTool(args: { param: string }) {
  return {
    content: [{ type: 'text', text: 'Tool result' }]
  };
}
```

#### `@resource(options)`

Define a resource that can be read by MCP clients.

```typescript
@resource({
  uri: 'scheme://path',
  name: 'Resource Name',
  description: 'Resource description',
  mimeType: 'text/plain' // optional
})
async myResource() {
  return {
    contents: [{
      uri: 'scheme://path',
      mimeType: 'text/plain',
      text: 'Resource content'
    }]
  };
}
```

#### `@prompt(options)`

Define a prompt template that can be used by MCP clients.

```typescript
@prompt({
  name: 'prompt_name',
  description: 'Prompt description',
  arguments: [{
    name: 'arg_name',
    description: 'Argument description',
    required: true
  }]
})
async myPrompt(args: { arg_name: string }) {
  return {
    description: 'Prompt description',
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Prompt with ${args.arg_name}`
      }
    }]
  };
}
```

### Schema

FastMCP uses Zod for schema validation:

```typescript
import { Schema } from 'fastjsmcp';

// Basic types
Schema.string()
Schema.number()
Schema.boolean()
Schema.array(Schema.string())

// Objects
Schema.object({
  name: Schema.string(),
  age: Schema.number().optional(),
  tags: Schema.array(Schema.string())
})

// Enums
Schema.enum(['option1', 'option2', 'option3'])

// Unions
Schema.union([Schema.string(), Schema.number()])
```

### FastMCP Options

```typescript
const server = new FastMCP({
  name: 'server-name',
  version: '1.0.0',
  logging: {
    level: 'info', // 'error' | 'warn' | 'info' | 'debug'
    format: 'simple' // 'simple' | 'json'
  },
  transport: {
    type: 'stdio', // 'stdio' | 'http' | 'websocket'
    port: 3000, // for http/websocket
    host: 'localhost' // for http/websocket
  }
});
```

## Examples

The repository includes several example servers:

- **Calculator**: Basic arithmetic operations
- **FileSystem**: File operations and resources
- **Prompts**: AI prompt generation
- **Comprehensive**: All features demonstration

Run examples with:

```bash
fastmcp run --server <example-name>
```

## Development

### Setup

```bash
git clone <repository-url>
cd fastjsmcp
pnpm install
```

### Scripts

```bash
# Build the project
pnpm build

# Run in development mode with hot reload
pnpm dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Lint code
pnpm lint

# Type check
pnpm check
```

### Project Structure

```
src/
├── core/           # Core FastMCP implementation
├── decorators/     # Decorator system
├── transport/      # Transport layer implementations
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── examples/       # Example servers
├── cli.ts          # CLI implementation
└── index.ts        # Main entry point

tests/              # Test files
├── setup.ts        # Test setup
└── *.test.ts       # Test files
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests and linting
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Links

- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [FastMCP Website](https://gofastmcp.com)