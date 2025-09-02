/**
 * FastMCP Function Decorator Usage Example
 * 
 * This example demonstrates how to test and use FastMCP decorators
 * to register ordinary functions as MCP tools, resources, and prompts.
 */

import { FastMCP } from '../src/core/fastmcp.js';
import { z } from 'zod';

// Create FastMCP instance
const mcp = new FastMCP({
  name: 'Function Decorator Example',
  version: '1.0.0',
});

// Example 1: Tool Decorator on Function Expression
// This shows how to use mcp.tool() to decorate a function
const calculator = mcp.tool({
  name: 'calculator',
  description: 'Perform basic arithmetic operations',
  inputSchema: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
})(async function(args: { operation: string; a: number; b: number }) {
  let result: number;
  
  switch (args.operation) {
    case 'add':
      result = args.a + args.b;
      break;
    case 'subtract':
      result = args.a - args.b;
      break;
    case 'multiply':
      result = args.a * args.b;
      break;
    case 'divide':
      if (args.b === 0) {
        throw new Error('Division by zero is not allowed');
      }
      result = args.a / args.b;
      break;
    default:
      throw new Error(`Unknown operation: ${args.operation}`);
  }
  
  return {
    content: [{
      type: 'text' as const,
      text: `${args.a} ${args.operation} ${args.b} = ${result}`,
    }],
  };
});

// Example 2: Resource Decorator
const getSystemInfo = mcp.resource({
  uri: 'system://info',
  name: 'System Information',
  description: 'Get system information',
  mimeType: 'application/json',
})(async function() {
  const info = {
    platform: process.platform,
    nodeVersion: process.version,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  };
  
  return {
    contents: [{
      uri: 'system://info',
      mimeType: 'application/json',
      text: JSON.stringify(info, null, 2),
    }],
  };
});

// Example 3: Prompt Decorator
const codeReviewPrompt = mcp.prompt({
  name: 'code_review',
  description: 'Generate a code review prompt',
  arguments: z.object({
    language: z.string().describe('Programming language'),
    codeSnippet: z.string().describe('Code to review'),
    focusArea: z.enum(['performance', 'security', 'readability', 'best-practices']).describe('Review focus area'),
  }),
})(async function(params?: Record<string, any>) {
  const args = params as { language: string; codeSnippet: string; focusArea: string };
  
  return {
    description: `Code review prompt for ${args.language} focusing on ${args.focusArea}`,
    messages: [{
      role: 'user' as const,
      content: [{
        type: 'text' as const,
        text: `Please review this ${args.language} code with focus on ${args.focusArea}:\n\n\`\`\`${args.language}\n${args.codeSnippet}\n\`\`\`\n\nProvide specific feedback and suggestions for improvement.`,
      }],
    }],
  };
});

// Example 4: Manual Registration (Alternative approach)
async function stringUtils(args: { text: string; operation: string }) {
  const { text, operation } = args;
  
  let result: string;
  switch (operation) {
    case 'uppercase':
      result = text.toUpperCase();
      break;
    case 'lowercase':
      result = text.toLowerCase();
      break;
    case 'reverse':
      result = text.split('').reverse().join('');
      break;
    case 'length':
      result = `Length: ${text.length}`;
      break;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
  
  return {
    content: [{
      type: 'text' as const,
      text: result,
    }],
  };
}

// Register the function manually
mcp.registerTool('string_utils', stringUtils, {
  description: 'Perform string operations',
  inputSchema: z.object({
    text: z.string().describe('Input text'),
    operation: z.enum(['uppercase', 'lowercase', 'reverse', 'length']).describe('Operation to perform'),
  }),
});

// Example 5: Testing Functions
export async function testFunctionDecorators() {
  console.log('Testing FastMCP Function Decorators...');
  
  try {
    // Test calculator tool
    const calcResult = await calculator({ operation: 'add', a: 5, b: 3 });
    console.log('Calculator test:', calcResult.content[0].text);
    
    // Test system info resource
    const sysInfo = await getSystemInfo();
    console.log('System info test:', JSON.parse(sysInfo.contents[0].text).platform);
    
    // Test code review prompt
    const promptResult = await codeReviewPrompt({
      language: 'javascript',
      codeSnippet: 'function add(a, b) { return a + b; }',
      focusArea: 'best-practices'
    });
    console.log('Prompt test:', promptResult.description);
    
    // Test string utils
    const stringResult = await stringUtils({ text: 'Hello World', operation: 'uppercase' });
    console.log('String utils test:', stringResult.content[0].text);
    
    console.log('All tests passed! ✅');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testFunctionDecorators();
}

// Export for use in other files
export { mcp, calculator, getSystemInfo, codeReviewPrompt, stringUtils };