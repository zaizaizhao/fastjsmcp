# FastJsMcp

A frontend developer's own MCP server implementation. Create a fully functional Model Context Protocol (MCP) server with just two decorators, supporting JavaScript/TypeScript.

```typescript
@fastMcp({
  name: 'calculator-server',
  version: '1.0.0',
  transport: {
    type: TransportType.Streamable,
    port: 3323,
    host: 'localhost',
    endpoint: '/mcp',
  },
})
export class CalculatorServer {
  @tool({
    name: 'add',
    description: 'Add two numbers',
    inputSchema: Schema.object({
      a: Schema.number().describe("First number a"),
      b: Schema.number().describe("Second number b"),
    }),
  })
  async add(args: { a: number; b: number }, context: ExecutionContext) {
    const result = args.a + args.b;
    return {
      content: [{
        type: 'text' as const,
        text: `${args.a} + ${args.b} = ${result}`,
      }],
    };
  }
}
```

[中文文档](../README.md)

## ✨ Features

- 🚀 **Easy-to-use decorator system** - Use `@tool`, `@resource`, `@prompt`, `@fastMcp` decorators to quickly define functionality
- 🔒 **Built-in validation** - Powerful schema validation with Zod
- 📘 **Full TypeScript support** - Type safety and intelligent code completion
- 🔌 **Multiple transport layers** - Support for stdio, HTTP, WebSocket, SSE
- 📚 **Rich examples** - Complete examples including calculator, filesystem, prompt generation, and more
- 🧪 **Comprehensive testing** - Code quality ensured with Jest test suite
- ⚡ **Native TypeScript support** - Run `.ts` files directly without pre-compilation
- 🛠️ **Powerful CLI tools** - `fastjsmcp` command-line tool for development and debugging

## 📦 Installation

```bash
npm install fastjsmcp
# or
pnpm add fastjsmcp
# or
yarn add fastjsmcp
```

## 🚀 Quick Start

### Using Class Decorators

```typescript
import { fastMcp, tool, resource, prompt, Schema, TransportType } from 'fastjsmcp';

@fastMcp({
  name: 'my-server',
  version: '1.0.0',
  transport: {
    type: TransportType.Streamable,
    port: 3000,
    host: 'localhost',
    endpoint: '/mcp',
  },
})
class MyServer {
  @tool({
    name: 'calculate',
    description: 'Perform basic arithmetic operations',
    inputSchema: Schema.object({
      operation: Schema.enum(['add', 'subtract', 'multiply', 'divide']),
      a: Schema.number().describe('First number'),
      b: Schema.number().describe('Second number')
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
    description: 'Access data stored in memory'
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
    description: 'Generate code review prompt',
    arguments: [{
      name: 'code',
      description: 'Code to review',
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
          text: `Please review the following code and provide feedback:\n\n${args.code}`
        }
      }]
    };
  }
}
```

### Using Instance Methods

```typescript
import { FastMCP, Schema } from 'fastjsmcp';

const server = new FastMCP({
  name: 'my-server',
  version: '1.0.0'
});

// Register tool
server.registerTool('add', async (args) => {
  return {
    content: [{ type: 'text', text: `Result: ${args.a + args.b}` }]
  };
}, Schema.object({
  a: Schema.number(),
  b: Schema.number()
}));

// Register and run server
server.run();
```

## 🛠️ CLI Usage

FastMCP provides powerful command-line tools:

### Basic Commands

```bash
# List available example servers
fastjsmcp list

# Run built-in example servers
fastjsmcp run --server calculator
fastjsmcp run --server filesystem
fastjsmcp run --server prompts
fastjsmcp run --server comprehensive

# Run custom server files (TypeScript supported)
fastjsmcp run ./my-server.ts
fastjsmcp run ./my-server.js

# Use different transport layers
fastjsmcp run --server calculator --transport streamable --port 3000
fastjsmcp run --server filesystem --transport stdio
```

### Debugging and Inspection

```bash
# Start MCP Inspector for debugging
fastjsmcp inspect ./my-server.ts
fastjsmcp inspect ./my-server.js --port 6274

# Use configuration file
fastjsmcp inspect ./server.ts --config ./inspector.json
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-s, --server <type>` | Server type (calculator, filesystem, prompts, comprehensive) | calculator |
| `-t, --transport <type>` | Transport type (stdio, http, websocket) | stdio |
| `-p, --port <port>` | HTTP/WebSocket port | 3000 |
| `-h, --host <host>` | HTTP/WebSocket host | localhost |
| `-l, --log-level <level>` | Log level (error, warn, info, debug) | info |
| `--log-format <format>` | Log format (simple, json) | simple |
| `-n, --name <name>` | Server name | - |
| `--server-version <version>` | Server version | 1.0.0 |

## 📖 API Reference

### Decorators

#### `@fastMcp(options)`

Class decorator for automatically setting up and registering MCP server.

```typescript
@fastMcp({
  name: 'server-name',
  version: '1.0.0',
  transport: {
    type: TransportType.Streamable,
    port: 3000,
    host: 'localhost',
    endpoint: '/mcp'
  }
})
class MyServer {
  // Server implementation
}
```

#### `@tool(options)`

Define a tool that can be called by MCP clients.

```typescript
@tool({
  name: 'tool_name',
  description: 'Tool description',
  inputSchema: Schema.object({
    param: Schema.string().describe('Parameter description')
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

### Schema Validation

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

// Union types
Schema.union([Schema.string(), Schema.number()])

// With descriptions
Schema.string().describe('String parameter description')
```

### FastMCP Configuration Options

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

## 📚 Examples

The project includes multiple example servers:

### Calculator Server
Basic arithmetic operations functionality.

```bash
fastjsmcp run --server calculator
```

### Filesystem Server
File operations and resource access.

```bash
fastjsmcp run --server filesystem --base-path ./
```

### Prompts Server
AI prompt generation examples.

```bash
fastjsmcp run --server prompts
```

### Comprehensive Example
Complete example showcasing all features.

```bash
fastjsmcp run --server comprehensive
```

## 🔧 Development

### Environment Setup

```bash
git clone <repository-url>
cd fastjsmcp
pnpm install
```

### Development Scripts

```bash
# Build project
pnpm build

# Development mode (hot reload)
pnpm dev

# Run tests
pnpm test

# Watch mode tests
pnpm test:watch

# Code linting
pnpm lint

# Fix code style
pnpm lint:fix

# Type checking
pnpm check

# Clean build files
pnpm clean
```

### TypeScript Support

FastMCP fully supports TypeScript development:

- Run `.ts` files directly without pre-compilation
- Complete type definitions and intelligent code completion
- Automatic TypeScript file handling using `tsx` runtime

```bash
# Run TypeScript server directly
fastjsmcp run ./my-server.ts

# Debug TypeScript server
fastjsmcp inspect ./my-server.ts
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Contribution Guidelines

- Add tests for new features
- Run tests and linting
- Follow existing code style
- Update relevant documentation

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Related Links

- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [GitHub Repository](https://github.com/zaizaizhao/fastjsmcp)

## 🆘 Support

If you encounter issues or have questions:

1. Check the [documentation](./docs/)
2. Search [Issues](https://github.com/zaizaizhao/fastjsmcp/issues)
3. Create a new Issue
4. Join [Discussions](https://github.com/zaizaizhao/fastjsmcp/discussions)

---

**FastJsMcp** - Making MCP server development fast and simple! 🚀