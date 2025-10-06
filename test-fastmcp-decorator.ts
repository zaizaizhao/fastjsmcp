// Test file for @fastMcp decorator
import { fastMcp, tool, Schema, TransportType } from './src/index.js';

@fastMcp({
  name: 'test-server',
  version: '1.0.0',
  transport: {
    type: TransportType.Streamable,
    port: 3333,
    host: 'localhost',
    endpoint: '/mcp',
  },
})
class TestServer {
  @tool({
    name: 'hello',
    description: 'Say hello',
    inputSchema: Schema.object({
      name: Schema.string(),
    }),
  })
  async hello(args: { name: string }) {
    return {
      content: [{
        type: 'text',
        text: `Hello, ${args.name}!`,
      }],
    };
  }
}

// This should automatically start the server when run directly
new TestServer();