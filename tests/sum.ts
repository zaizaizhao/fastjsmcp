import { FastMCP,Schema,tool } from '../src/index.js';
import { z } from 'zod';

const mcp = new FastMCP({
  name: 'test-function-decorators',
  version: '1.0.0',
  logging: {
    level: 'error', // Reduce noise in tests
  },
});

// 正确的装饰器用法：通过 FastMCP 实例调用
const Sum = mcp.tool({
  name: 'sum',
  description: 'Add two numbers together',
  inputSchema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
})(async function(args: { a: number; b: number }) {
  const result = args.a + args.b;
  return {
    content: [{
      type: 'text' as const,
      text: `${args.a} + ${args.b} = ${result}`,
    }],
  };
});


class SumTest{
  @mcp.tool({
    name:"add",
    description:"add two number",
    inputSchema: z.object({
      a: z.number(),
      b: z.number()
    })
  })
  sum(a:number,b:number){
    return {
      content: [{
        type: 'text' as const,
        text: `${a} + ${b} = ${a + b}`,
      }],
    };
  }
}

// 导出以供测试使用
export { mcp, Sum };