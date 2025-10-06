import { fastMcp, tool, Schema, TransportType } from '../index.js';
import type { ExecutionContext } from '../types/index.js';

/**
 * Calculator server example demonstrating tool usage
 */
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
      a: Schema.number().describe("传入数字a"),
      b: Schema.number().describe("传入数字b"),
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

  @tool({
    name: 'subtract',
    description: 'Subtract two numbers',
    inputSchema: Schema.object({
      a: Schema.number().describe("传入数字a"),
      b: Schema.number().describe("传入数字b"),
    }),
  })
  async subtract(args: { a: number; b: number }) {
    return { result: args.a - args.b };
  }

  @tool({
    name: 'multiply',
    description: 'Multiply two numbers',
    inputSchema: Schema.object({
      a: Schema.number(),
      b: Schema.number(),
    }),
  })
  async multiply(args: { a: number; b: number }) {
    return { result: args.a * args.b };
  }

  @tool({
    name: 'divide',
    description: 'Divide two numbers',
    inputSchema: Schema.object({
      a: Schema.number(),
      b: Schema.number(),
    }),
  })
  async divide(args: { a: number; b: number }) {
    if (args.b === 0) {
      throw new Error('Division by zero is not allowed');
    }
    return { result: args.a / args.b };
  }

  @tool({
    name: 'calculate',
    description: 'Perform a calculation with an expression',
    inputSchema: Schema.object({
      operation: Schema.string().describe("运算操作类型 (add, subtract, multiply, divide)"),
      a: Schema.number().describe("第一个数字"),
      b: Schema.number().describe("第二个数字"),
    }),
  })
  async calculate(args: { operation: string; a: number; b: number }, context: ExecutionContext) {
    const { operation, a, b } = args;
    let result: number;
    let symbol: string;
    
    switch (operation.toLowerCase()) {
      case 'add':
      case '+':
        result = a + b;
        symbol = '+';
        break;
      case 'subtract':
      case '-':
        result = a - b;
        symbol = '-';
        break;
      case 'multiply':
      case '*':
        result = a * b;
        symbol = '×';
        break;
      case 'divide':
      case '/':
        if (b === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Division by zero is not allowed',
            }],
            isError: true,
          };
        }
        result = a / b;
        symbol = '÷';
        break;
      default:
        return {
          content: [{
            type: 'text' as const,
            text: `Error: Unknown operation '${operation}'. Supported operations: add, subtract, multiply, divide`,
          }],
          isError: true,
        };
    }
    
    return {
      content: [{
        type: 'text' as const,
        text: `${a} ${symbol} ${b} = ${result}`,
      }],
    };
  }
}

// If the module is being run directly (not imported), instantiate the server
// Note: This is no longer needed when using @fastMcp decorator with CLI
// The CLI will automatically detect and instantiate decorated classes
// if (require.main === module) {
//   new CalculatorServer();
// }

