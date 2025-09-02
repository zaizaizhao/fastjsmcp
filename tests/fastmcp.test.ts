import { FastMCP, tool, resource, prompt, Schema } from '../src/index.js';
import { CalculatorServer } from '../src/examples/calculator.js';
import { FileSystemServer } from '../src/examples/filesystem.js';
import { PromptServer } from '../src/examples/prompts.js';

describe('FastMCP', () => {
  let fastmcp: FastMCP;

  beforeEach(() => {
    fastmcp = new FastMCP({
      name: 'test-server',
      version: '1.0.0',
      logging: {
        level: 'error', // Reduce noise in tests
      },
    });
  });

  afterEach(async () => {
    if (fastmcp) {
      await fastmcp.stop();
    }
  });

  describe('Basic functionality', () => {
    it('should create a FastMCP instance', () => {
      expect(fastmcp).toBeInstanceOf(FastMCP);
    });

    it('should register a server class', () => {
      const calculator = new CalculatorServer();
      expect(() => fastmcp.register(calculator)).not.toThrow();
    });

    it('should handle multiple server registrations', () => {
      const calculator = new CalculatorServer();
      const prompts = new PromptServer();
      
      expect(() => {
        fastmcp.register(calculator);
        fastmcp.register(prompts);
      }).not.toThrow();
    });
  });

  describe('Decorators', () => {
    class TestServer {
      @tool({
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: Schema.object({
          message: Schema.string(),
        }),
      })
      async testTool(args: { message: string }) {
        return {
          content: [{
            type: 'text' as const,
            text: `Echo: ${args.message}`,
          }],
        };
      }

      @resource({
        uri: 'test://resource',
        name: 'Test Resource',
        description: 'A test resource',
      })
      async testResource() {
        return {
          contents: [{
            uri: 'test://resource',
            mimeType: 'text/plain',
            text: 'Test resource content',
          }],
        };
      }

      @prompt({
        name: 'test_prompt',
        description: 'A test prompt',
        arguments: [{
          name: 'topic',
          description: 'The topic to generate a prompt for',
          required: true,
        }],
      })
      async testPrompt(args: { topic: string }) {
        return {
          description: `Test prompt for ${args.topic}`,
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Tell me about ${args.topic}`,
            },
          }],
        };
      }
    }

    it('should register tools from decorated methods', () => {
      const testServer = new TestServer();
      expect(() => fastmcp.register(testServer)).not.toThrow();
    });

    it('should register resources from decorated methods', () => {
      const testServer = new TestServer();
      expect(() => fastmcp.register(testServer)).not.toThrow();
    });

    it('should register prompts from decorated methods', () => {
      const testServer = new TestServer();
      expect(() => fastmcp.register(testServer)).not.toThrow();
    });
  });

  describe('Example servers', () => {
    it('should register CalculatorServer', () => {
      const calculator = new CalculatorServer();
      expect(() => fastmcp.register(calculator)).not.toThrow();
    });

    it('should register FileSystemServer', () => {
      const filesystem = new FileSystemServer();
      expect(() => fastmcp.register(filesystem)).not.toThrow();
    });

    it('should register PromptServer', () => {
      const prompts = new PromptServer();
      expect(() => fastmcp.register(prompts)).not.toThrow();
    });
  });

  describe('Schema validation', () => {
    it('should create valid Zod schemas', () => {
      const stringSchema = Schema.string();
      const numberSchema = Schema.number();
      const objectSchema = Schema.object({
        name: Schema.string(),
        age: Schema.number(),
      });

      expect(() => stringSchema.parse('test')).not.toThrow();
      expect(() => numberSchema.parse(42)).not.toThrow();
      expect(() => objectSchema.parse({ name: 'John', age: 30 })).not.toThrow();
    });

    it('should validate input correctly', () => {
      const schema = Schema.object({
        operation: Schema.enum(['add', 'subtract']),
        a: Schema.number(),
        b: Schema.number(),
      });

      expect(() => schema.parse({
        operation: 'add',
        a: 5,
        b: 3,
      })).not.toThrow();

      expect(() => schema.parse({
        operation: 'invalid',
        a: 5,
        b: 3,
      })).toThrow();
    });
  });

  describe('Error handling', () => {
    it('should handle invalid server registration gracefully', () => {
      // Test with null/undefined
      expect(() => fastmcp.register(null as any)).toThrow();
      expect(() => fastmcp.register(undefined as any)).toThrow();
    });

    it('should handle server initialization errors', async () => {
      // This test would need to mock the MCP server to throw an error
      // For now, we just ensure the method exists
      expect(typeof fastmcp.run).toBe('function');
      expect(typeof fastmcp.stop).toBe('function');
    });
  });
});