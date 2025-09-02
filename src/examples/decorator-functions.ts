import { z } from 'zod';
import { FastMCP } from '../core/fastmcp.js';

// Initialize FastMCP instance
const mcp = new FastMCP({
  name: "Function Decorators Demo 🚀",
  version: "1.0.0",
});

// Define schemas
const addSchema = z.object({
  a: z.number().describe("First number"),
  b: z.number().describe("Second number"),
});

const greetSchema = z.object({
  name: z.string().describe("Name to greet"),
});

// Python-like decorator usage with function expressions
const add = mcp.tool({
  description: "Add two numbers together",
  inputSchema: addSchema,
})(async function(args: z.infer<typeof addSchema>) {
  return {
    content: [{
      type: 'text' as const,
      text: `${args.a} + ${args.b} = ${args.a + args.b}`,
    }],
  };
});

const subtract = mcp.tool({
  description: "Subtract two numbers",
  inputSchema: addSchema,
})(async function(args: z.infer<typeof addSchema>) {
  return {
    content: [{
      type: 'text' as const,
      text: `${args.a} - ${args.b} = ${args.a - args.b}`,
    }],
  };
});

const greet = mcp.tool({
  description: "Greet someone by name",
  inputSchema: greetSchema,
})(async function(args: z.infer<typeof greetSchema>) {
  return {
    content: [{
      type: 'text' as const,
      text: `Hello, ${args.name}! 👋`,
    }],
  };
});

// Resource example
const getDemoInfo = mcp.resource({
  uri: "demo://info",
  name: "Demo Information",
  description: "Information about this demo",
  mimeType: "text/plain",
})(async function() {
  return {
    contents: [{
      uri: "demo://info",
      mimeType: "text/plain",
      text: "This is a FastMCP demo using decorator functions!",
    }],
  };
});

// Prompt example
const codingTask = mcp.prompt({
  description: "Generate a coding task prompt",
  arguments: z.object({
    language: z.string().describe("Programming language"),
    difficulty: z.enum(["easy", "medium", "hard"]).describe("Task difficulty"),
  }),
})(async function(params?: Record<string, any>) {
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
});

// Run the server
if (import.meta.url === `file://${process.argv[1]}`) {
  mcp.run().catch(console.error);
}

export { mcp, add, subtract, greet, getDemoInfo, codingTask };