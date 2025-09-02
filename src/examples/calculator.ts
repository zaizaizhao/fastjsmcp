import { FastMCP, tool, Schema } from '../index.js';
import type { ExecutionContext } from '../types/index.js';

/**
 * Calculator server example demonstrating tool usage
 */
class CalculatorServer {
  @tool({
    name: 'add',
    description: 'Add two numbers',
    inputSchema: Schema.object({
      a: Schema.number(),
      b: Schema.number(),
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
      a: Schema.number(),
      b: Schema.number(),
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
      expression: Schema.string(),
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

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new FastMCP({
    name: 'calculator-server',
    version: '1.0.0',
    logging: {
      level: 'info',
    },
  });

  server.register(new CalculatorServer());
  server.run().catch(console.error);
}

export { CalculatorServer };