import { FastMCP } from '../core/fastmcp.js';
import { z } from 'zod';

// Create FastMCP instance
const mcp = new FastMCP({
  name: "Function Decorators Demo",
  version: "1.0.0",
});

// Define input schemas
const addSchema = z.object({
  a: z.number().describe("First number"),
  b: z.number().describe("Second number"),
});

const greetSchema = z.object({
  name: z.string().describe("Name to greet"),
});

// Use mcp.tool decorator on functions (Python-like syntax)
// Note: TypeScript doesn't support decorators on function declarations,
// so we use function expressions and manual registration

async function add(args: z.infer<typeof addSchema>) {
  return {
    content: [{
      type: 'text' as const,
      text: `${args.a} + ${args.b} = ${args.a + args.b}`,
    }],
  };
}

async function subtract(args: z.infer<typeof addSchema>) {
  return {
    content: [{
      type: 'text' as const,
      text: `${args.a} - ${args.b} = ${args.a - args.b}`,
    }],
  };
}

async function greet(args: z.infer<typeof greetSchema>) {
  return {
    content: [{
      type: 'text' as const,
      text: `Hello, ${args.name}! 👋`,
    }],
  };
}

// Register tools using the instance decorators
mcp.registerTool('add', add, {
  description: "Add two numbers together",
  inputSchema: addSchema,
});

mcp.registerTool('subtract', subtract, {
  description: "Subtract two numbers",
  inputSchema: addSchema,
});

mcp.registerTool('greet', greet, {
  description: "Greet someone by name",
  inputSchema: greetSchema,
});

// Resource example
async function getDemoInfo() {
  return {
    contents: [{
      uri: "demo://info",
      mimeType: "text/plain",
      text: "This is a FastMCP demo using function registration!",
    }],
  };
}

// Register resource
mcp.registerResource("demo://info", getDemoInfo, {
  name: "Demo Information",
  description: "Information about this demo",
  mimeType: "text/plain",
});

// Prompt example
async function codingTask(params?: Record<string, any>) {
  const args = params as { language: string; difficulty: string };
  const tasks = {
    easy: "Create a simple hello world program",
    medium: "Implement a basic calculator",
    hard: "Build a web server with authentication",
  };
  
  return {
    description: `A ${args.difficulty} coding task in ${args.language}`,
    messages: [{
      role: 'user' as const,
      content: [{
        type: 'text' as const,
        text: `Create a ${args.difficulty} level task: ${tasks[args.difficulty as keyof typeof tasks]} using ${args.language}.`,
      }],
    }],
  };
}

// Register prompt
mcp.registerPrompt('codingTask', codingTask, {
  description: "Generate a coding task prompt",
  arguments: z.object({
    language: z.string().describe("Programming language"),
    difficulty: z.enum(["easy", "medium", "hard"]).describe("Task difficulty"),
  }),
});

// Run the server
if (import.meta.url === `file://${process.argv[1]}`) {
  mcp.run().catch(console.error);
}

export { mcp };