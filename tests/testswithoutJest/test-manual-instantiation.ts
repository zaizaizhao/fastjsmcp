import { fastMcp, tool } from '../../src/decorators/index.js';
import { TransportType } from '../../src/types/index.js';

@fastMcp({
  name: 'test-manual-server',
  version: '1.0.0',
  transport: {
    type: TransportType.Streamable,
    port: 3324,
    host: 'localhost',
    endpoint: '/mcp',
  },
})
export class TestManualServer {
  @tool({
    name: 'test_add',
    description: 'Add two numbers',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'number', description: 'First number' },
        b: { type: 'number', description: 'Second number' },
      },
      required: ['a', 'b'],
    },
  })
  async add(args: { a: number; b: number }): Promise<{ result: number }> {
    return { result: args.a + args.b };
  }
}

// Test manual instantiation - this should still work
console.log('Testing manual instantiation...');
new TestManualServer();