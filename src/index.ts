// FastMCP - A fast and easy-to-use Model Context Protocol server for JavaScript/TypeScript

// Version
export const VERSION = '1.0.0';

// Core exports
export { FastMCP } from './core/fastmcp.js';

// Decorator exports
export { tool, resource, prompt, fastMcp, Schema } from './decorators/index.js';

// Transport exports
export { TransportFactory, StdioServerTransport, SSEServerTransport } from './transport/index.js';
export { startStreamableMcpServer } from './transport/streamable.js';

// Utility exports
export * from './utils/index.js';

// Type exports
export * from './types/index.js';

// Example exports
export { CalculatorServer } from './examples/calculator.js';
export { FileSystemServer } from './examples/filesystem.js';
export { PromptServer } from './examples/prompts.js';
export { ComprehensiveServer } from './examples/comprehensive.js';

// Example usage:
// import { FastMCP, tool, Schema } from 'fastmcp';
// 
// class MyServer {
//   @tool({
//     name: 'calculate',
//     description: 'Perform basic arithmetic',
//     inputSchema: Schema.object({
//       operation: Schema.enum(['add', 'subtract', 'multiply', 'divide']),
//       a: Schema.number(),
//       b: Schema.number()
//     })
//   })
//   async calculate(args: { operation: string; a: number; b: number }) {
//     const { operation, a, b } = args;
//     switch (operation) {
//       case 'add': return { result: a + b };
//       case 'subtract': return { result: a - b };
//       case 'multiply': return { result: a * b };
//       case 'divide': 
//         if (b === 0) throw new Error('Division by zero');
//         return { result: a / b };
//       default: throw new Error('Unknown operation');
//     }
//   }
// }
// 
// const server = new FastMCP({ name: 'my-server', version: '1.0.0' });
// server.register(new MyServer());
// server.run();