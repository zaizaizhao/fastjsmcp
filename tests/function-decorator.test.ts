import { FastMCP } from '../src/index.js';
import { z } from 'zod';

describe('FastMCP Function Decorators', () => {
  let mcp: FastMCP;

  beforeEach(() => {
    mcp = new FastMCP({
      name: 'test-function-decorators',
      version: '1.0.0',
      logging: {
        level: 'error', // Reduce noise in tests
      },
    });
  });

  afterEach(async () => {
    if (mcp) {
      await mcp.stop();
    }
  });

  describe('Tool Decorator on Functions', () => {
    it('should register a tool using mcp.tool decorator on function expression', () => {
      const addSchema = z.object({
        a: z.number().describe('First number'),
        b: z.number().describe('Second number'),
      });

      // Use mcp.tool decorator on function expression
      const add = mcp.tool({
        description: 'Add two numbers together',
        inputSchema: addSchema,
      })(async function(args: z.infer<typeof addSchema>) {
        return {
          content: [{
            type: 'text' as const,
            text: `${args.a} + ${args.b} = ${args.a + args.b}`,
          }],
        };
      });

      expect(add).toBeDefined();
      expect(typeof add).toBe('function');
    });

    it('should register multiple tools using decorators', () => {
      const mathSchema = z.object({
        a: z.number(),
        b: z.number(),
      });

      const add = mcp.tool({
        description: 'Add two numbers',
        inputSchema: mathSchema,
      })(async function(args: z.infer<typeof mathSchema>) {
        return {
          content: [{
            type: 'text' as const,
            text: `Result: ${args.a + args.b}`,
          }],
        };
      });

      const multiply = mcp.tool({
        description: 'Multiply two numbers',
        inputSchema: mathSchema,
      })(async function(args: z.infer<typeof mathSchema>) {
        return {
          content: [{
            type: 'text' as const,
            text: `Result: ${args.a * args.b}`,
          }],
        };
      });

      expect(add).toBeDefined();
      expect(multiply).toBeDefined();
    });

    it('should handle tool with custom name', () => {
      const greetSchema = z.object({
        name: z.string().describe('Name to greet'),
      });

      const greetFunction = mcp.tool({
        name: 'custom_greet',
        description: 'Greet someone by name',
        inputSchema: greetSchema,
      })(async function(args: z.infer<typeof greetSchema>) {
        return {
          content: [{
            type: 'text' as const,
            text: `Hello, ${args.name}! 👋`,
          }],
        };
      });

      expect(greetFunction).toBeDefined();
    });
  });

  describe('Resource Decorator on Functions', () => {
    it('should register a resource using mcp.resource decorator', () => {
      const getInfo = mcp.resource({
        uri: 'test://info',
        name: 'Test Information',
        description: 'Test resource information',
        mimeType: 'text/plain',
      })(async function() {
        return {
          contents: [{
            uri: 'test://info',
            mimeType: 'text/plain',
            text: 'This is test resource content',
          }],
        };
      });

      expect(getInfo).toBeDefined();
      expect(typeof getInfo).toBe('function');
    });

    it('should register multiple resources', () => {
      const getConfig = mcp.resource({
        uri: 'test://config',
        name: 'Configuration',
        description: 'Application configuration',
        mimeType: 'application/json',
      })(async function() {
        return {
          contents: [{
            uri: 'test://config',
            mimeType: 'application/json',
            text: JSON.stringify({ version: '1.0.0', debug: true }),
          }],
        };
      });

      const getStatus = mcp.resource({
        uri: 'test://status',
        name: 'Status',
        description: 'Application status',
        mimeType: 'text/plain',
      })(async function() {
        return {
          contents: [{
            uri: 'test://status',
            mimeType: 'text/plain',
            text: 'Status: Running',
          }],
        };
      });

      expect(getConfig).toBeDefined();
      expect(getStatus).toBeDefined();
    });
  });

  describe('Prompt Decorator on Functions', () => {
    it('should register a prompt using mcp.prompt decorator', () => {
      const taskPrompt = mcp.prompt({
        description: 'Generate a task prompt',
        arguments: z.object({
          task: z.string().describe('Task description'),
          priority: z.enum(['low', 'medium', 'high']).describe('Task priority'),
        }),
      })(async function(params?: Record<string, any>) {
        const args = params as { task: string; priority: string };
        return {
          description: `Task prompt for ${args.task}`,
          messages: [{
            role: 'user' as const,
            content: [{
              type: 'text' as const,
              text: `Please complete this ${args.priority} priority task: ${args.task}`,
            }],
          }],
        };
      });

      expect(taskPrompt).toBeDefined();
      expect(typeof taskPrompt).toBe('function');
    });

    it('should register prompt with custom name', () => {
      const codePrompt = mcp.prompt({
        name: 'code_generator',
        description: 'Generate code prompt',
        arguments: z.object({
          language: z.string().describe('Programming language'),
          feature: z.string().describe('Feature to implement'),
        }),
      })(async function(params?: Record<string, any>) {
        const args = params as { language: string; feature: string };
        return {
          description: `Code generation prompt for ${args.language}`,
          messages: [{
            role: 'user' as const,
            content: [{
              type: 'text' as const,
              text: `Write ${args.language} code to implement: ${args.feature}`,
            }],
          }],
        };
      });

      expect(codePrompt).toBeDefined();
    });
  });

  describe('Manual Registration Methods', () => {
    it('should register tool using registerTool method', () => {
      const mathSchema = z.object({
        x: z.number(),
        y: z.number(),
      });

      async function subtract(args: z.infer<typeof mathSchema>) {
        return {
          content: [{
            type: 'text' as const,
            text: `${args.x} - ${args.y} = ${args.x - args.y}`,
          }],
        };
      }

      expect(() => {
        mcp.registerTool('subtract', subtract, {
          description: 'Subtract two numbers',
          inputSchema: mathSchema,
        });
      }).not.toThrow();
    });

    it('should register resource using registerResource method', () => {
      async function getHelp() {
        return {
          contents: [{
            uri: 'help://main',
            mimeType: 'text/plain',
            text: 'This is help content',
          }],
        };
      }

      expect(() => {
        mcp.registerResource('help://main', getHelp, {
          name: 'Help Documentation',
          description: 'Main help documentation',
          mimeType: 'text/plain',
        });
      }).not.toThrow();
    });

    it('should register prompt using registerPrompt method', () => {
      async function helpPrompt(params?: Record<string, any>) {
        const args = params as { topic: string };
        return {
          description: `Help prompt for ${args.topic}`,
          messages: [{
            role: 'user' as const,
            content: [{
              type: 'text' as const,
              text: `Please provide help about: ${args.topic}`,
            }],
          }],
        };
      }

      expect(() => {
        mcp.registerPrompt('help', helpPrompt, {
          description: 'Generate help prompt',
          arguments: z.object({
            topic: z.string().describe('Help topic'),
          }),
        });
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid decorator usage', () => {
      expect(() => {
        // @ts-ignore - Testing invalid usage
        mcp.tool()(null);
      }).toThrow();
    });

    it('should handle registration with invalid parameters', () => {
      expect(() => {
        // @ts-ignore - Testing invalid usage
        mcp.registerTool(null, null, null);
      }).toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should work with mixed registration approaches', () => {
      // Decorator approach
      const decoratedAdd = mcp.tool({
        description: 'Add using decorator',
        inputSchema: z.object({
          a: z.number(),
          b: z.number(),
        }),
      })(async function(args: { a: number; b: number }) {
        return {
          content: [{
            type: 'text' as const,
            text: `Decorated: ${args.a + args.b}`,
          }],
        };
      });

      // Manual registration approach
      async function manualMultiply(args: { a: number; b: number }) {
        return {
          content: [{
            type: 'text' as const,
            text: `Manual: ${args.a * args.b}`,
          }],
        };
      }

      mcp.registerTool('manual_multiply', manualMultiply, {
        description: 'Multiply using manual registration',
        inputSchema: z.object({
          a: z.number(),
          b: z.number(),
        }),
      });

      expect(decoratedAdd).toBeDefined();
      expect(manualMultiply).toBeDefined();
    });
  });
});