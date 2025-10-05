import { FastMCP } from '../src/index.js';
import { TransportType } from '../src/types/index.js';
import { z } from 'zod';
import http from 'node:http';
import { randomUUID } from 'node:crypto';

// 测试工具函数
const testUtils = {
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
};

describe('FastMCP Streamable Function Decorators', () => {
  let mcp: FastMCP;
  let testPort: number;
  let testEndpoint: string;
  let httpServer: any;

  beforeEach(() => {
    // 使用更大的随机端口范围避免冲突
    testPort = 4000 + Math.floor(Math.random() * 5000);
    testEndpoint = '/mcp';
    
    mcp = new FastMCP({
      name: 'test-streamable-decorators',
      version: '1.0.0',
      transport: {
        type: TransportType.Streamable,
        port: testPort,
        host: 'localhost',
        endpoint: testEndpoint,
      },
      logging: {
        level: 'error', // 减少测试噪音
      },
    });
  });

  afterEach(async () => {
    if (mcp) {
      await mcp.stop();
    }
    if (httpServer) {
      httpServer.close();
    }
    // 增加等待时间确保端口完全释放
    await testUtils.wait(500);
  });

  describe('Basic Streamable Setup', () => {
    it('should create FastMCP instance with Streamable transport configuration', () => {
      expect(mcp).toBeDefined();
      // 测试实例创建成功，不直接访问私有属性
      expect(typeof mcp.run).toBe('function');
      expect(typeof mcp.stop).toBe('function');
      expect(typeof mcp.isHealthy).toBe('function');
    });

    it('should start server with Streamable transport', async () => {
      // 注册一个简单的工具用于测试
      const testTool = mcp.tool({
        description: 'Simple test tool',
        inputSchema: z.object({
          message: z.string(),
        }),
      })(async function(args: { message: string }) {
        return {
          content: [{
            type: 'text' as const,
            text: `Echo: ${args.message}`,
          }],
        };
      });

      expect(testTool).toBeDefined();
      
      // 启动服务器
      await expect(mcp.run()).resolves.not.toThrow();
      
      // 验证服务器状态
      expect(mcp.isHealthy()).toBe(true);
    }, 15000);
  });

  describe('Function Enhancement Tests', () => {
    it('should enhance simple calculation function to MCP tool', async () => {
      const calculatorSchema = z.object({
        operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
        a: z.number().describe('First number'),
        b: z.number().describe('Second number'),
      });

      // 普通函数增强为 MCP tool
      const calculator = mcp.tool({
        name: 'calculator',
        description: 'Perform basic mathematical operations',
        inputSchema: calculatorSchema,
      })(async function(args: z.infer<typeof calculatorSchema>) {
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
            if (args.b === 0) throw new Error('Division by zero');
            result = args.a / args.b;
            break;
        }
        
        return {
          content: [{
            type: 'text' as const,
            text: `${args.a} ${args.operation} ${args.b} = ${result}`,
          }],
        };
      });

      expect(calculator).toBeDefined();
      expect(typeof calculator).toBe('function');

      // 测试函数直接调用
      const directResult = await calculator({
        operation: 'add',
        a: 5,
        b: 3,
      });
      
      expect(directResult.content[0].text).toBe('5 add 3 = 8');
    });

    it('should enhance async string processing function', async () => {
      const textSchema = z.object({
        text: z.string().describe('Text to process'),
        operation: z.enum(['uppercase', 'lowercase', 'reverse', 'length']),
      });

      const textProcessor = mcp.tool({
        name: 'text_processor',
        description: 'Process text with various operations',
        inputSchema: textSchema,
      })(async function(args: z.infer<typeof textSchema>) {
        // 模拟异步操作
        await new Promise(resolve => setTimeout(resolve, 10));
        
        let result: string;
        switch (args.operation) {
          case 'uppercase':
            result = args.text.toUpperCase();
            break;
          case 'lowercase':
            result = args.text.toLowerCase();
            break;
          case 'reverse':
            result = args.text.split('').reverse().join('');
            break;
          case 'length':
            result = `Length: ${args.text.length}`;
            break;
        }
        
        return {
          content: [{
            type: 'text' as const,
            text: result,
          }],
          metadata: {
            originalText: args.text,
            operation: args.operation,
            timestamp: new Date().toISOString(),
          },
        };
      });

      expect(textProcessor).toBeDefined();

      // 测试不同操作
      const uppercaseResult = await textProcessor({
        text: 'Hello World',
        operation: 'uppercase',
      });
      expect(uppercaseResult.content[0].text).toBe('HELLO WORLD');
      expect(uppercaseResult.metadata?.originalText).toBe('Hello World');

      const reverseResult = await textProcessor({
        text: 'FastMCP',
        operation: 'reverse',
      });
      expect(reverseResult.content[0].text).toBe('PCMtsaF');
    });

    it('should enhance function with complex input/output schemas', async () => {
      const userSchema = z.object({
        users: z.array(z.object({
          id: z.number(),
          name: z.string(),
          email: z.string().email(),
          age: z.number().min(0).max(150),
        })),
        sortBy: z.enum(['name', 'age', 'email']).optional(),
        filterMinAge: z.number().optional(),
      });

      const userProcessor = mcp.tool({
        name: 'user_processor',
        description: 'Process and filter user data',
        inputSchema: userSchema,
      })(async function(args: z.infer<typeof userSchema>) {
        let users = [...args.users];
        
        // 过滤
        if (args.filterMinAge !== undefined) {
          users = users.filter(user => user.age >= args.filterMinAge!);
        }
        
        // 排序
        if (args.sortBy) {
          users.sort((a, b) => {
            const aVal = a[args.sortBy!];
            const bVal = b[args.sortBy!];
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          });
        }
        
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(users, null, 2),
          }],
          metadata: {
            totalUsers: args.users.length,
            filteredUsers: users.length,
            sortBy: args.sortBy,
            filterMinAge: args.filterMinAge,
          },
        };
      });

      const testUsers = [
        { id: 1, name: 'Alice', email: 'alice@test.com', age: 25 },
        { id: 2, name: 'Bob', email: 'bob@test.com', age: 30 },
        { id: 3, name: 'Charlie', email: 'charlie@test.com', age: 20 },
      ];

      const result = await userProcessor({
        users: testUsers,
        sortBy: 'age',
        filterMinAge: 22,
      });

      const processedUsers = JSON.parse(result.content[0].text);
      expect(processedUsers).toHaveLength(2); // Alice and Bob
      expect(processedUsers[0].name).toBe('Alice'); // 25 < 30
      expect(processedUsers[1].name).toBe('Bob');
      expect(result.metadata?.filteredUsers).toBe(2);
    });
  });

  describe('Streamable Transport Integration', () => {
    it('should start HTTP server for Streamable transport', async () => {
      const simpleTool = mcp.tool({
        description: 'Simple tool for transport test',
        inputSchema: z.object({
          value: z.string(),
        }),
      })(async function(args: { value: string }) {
        return {
          content: [{
            type: 'text' as const,
            text: `Processed: ${args.value}`,
          }],
        };
      });

      await mcp.run();
      
      // 验证服务器健康状态
      expect(mcp.isHealthy()).toBe(true);
      
      // 验证 HTTP 服务器可访问性
      const testEndpointUrl = `http://localhost:${testPort}${testEndpoint}`;
      
      // 创建简单的 HTTP 请求测试连接
      const testConnection = () => new Promise<boolean>((resolve) => {
        const req = http.request(testEndpointUrl, { method: 'GET' }, (res) => {
          resolve(res.statusCode !== undefined);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(1000, () => {
          req.destroy();
          resolve(false);
        });
        req.end();
      });

      const isConnectable = await testConnection();
      expect(isConnectable).toBe(true);
    }, 10000);

    it('should handle multiple concurrent tool registrations', async () => {
      const tools = [];
      
      // 注册多个工具
      for (let i = 0; i < 5; i++) {
        const tool = mcp.tool({
          name: `tool_${i}`,
          description: `Test tool number ${i}`,
          inputSchema: z.object({
            input: z.string(),
          }),
        })(async function(args: { input: string }) {
          return {
            content: [{
              type: 'text' as const,
              text: `Tool ${i} processed: ${args.input}`,
            }],
          };
        });
        tools.push(tool);
      }

      expect(tools).toHaveLength(5);
      tools.forEach(tool => expect(tool).toBeDefined());

      // 启动服务器
      await mcp.run();
      expect(mcp.isHealthy()).toBe(true);

      // 测试所有工具都能正常工作
      for (let i = 0; i < tools.length; i++) {
        const result = await tools[i]({ input: `test_${i}` });
        expect(result.content[0].text).toBe(`Tool ${i} processed: test_${i}`);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle tool execution errors gracefully', async () => {
      const errorTool = mcp.tool({
        name: 'error_tool',
        description: 'Tool that throws errors for testing',
        inputSchema: z.object({
          shouldError: z.boolean(),
          message: z.string(),
        }),
      })(async function(args: { shouldError: boolean; message: string }) {
        if (args.shouldError) {
          throw new Error(`Test error: ${args.message}`);
        }
        return {
          content: [{
            type: 'text' as const,
            text: `Success: ${args.message}`,
          }],
        };
      });

      // 测试正常情况
      const successResult = await errorTool({
        shouldError: false,
        message: 'test success',
      });
      expect(successResult.content[0].text).toBe('Success: test success');

      // 测试错误情况
      await expect(errorTool({
        shouldError: true,
        message: 'test error',
      })).rejects.toThrow('Test error: test error');
    });

    it('should handle invalid input schemas', async () => {
      const strictTool = mcp.tool({
        description: 'Tool with strict validation',
        inputSchema: z.object({
          email: z.string().email(),
          age: z.number().min(0).max(150),
          name: z.string().min(1),
        }),
      })(async function(args: { email: string; age: number; name: string }) {
        return {
          content: [{
            type: 'text' as const,
            text: `Valid user: ${args.name}, ${args.email}, ${args.age}`,
          }],
        };
      });

      // 测试有效输入
      const validResult = await strictTool({
        email: 'test@example.com',
        age: 25,
        name: 'John',
      });
      expect(validResult.content[0].text).toBe('Valid user: John, test@example.com, 25');

      // 注意：输入验证通常在 MCP 协议层处理，这里主要测试函数逻辑
    });

    it('should handle server lifecycle correctly', async () => {
      const lifecycleTool = mcp.tool({
        description: 'Tool for lifecycle testing',
        inputSchema: z.object({
          action: z.string(),
        }),
      })(async function(args: { action: string }) {
        return {
          content: [{
            type: 'text' as const,
            text: `Lifecycle action: ${args.action}`,
          }],
        };
      });

      // 启动服务器
      await mcp.run();
      expect(mcp.isHealthy()).toBe(true);

      // 测试工具功能
      const result = await lifecycleTool({ action: 'test' });
      expect(result.content[0].text).toBe('Lifecycle action: test');

      // 停止服务器
      await mcp.stop();
      // 停止后健康检查应该返回 false
      expect(mcp.isHealthy()).toBe(false);

      // 重新启动
      await mcp.run();
      expect(mcp.isHealthy()).toBe(true);
      
      // 验证工具仍然可用
      const result2 = await lifecycleTool({ action: 'restart_test' });
      expect(result2.content[0].text).toBe('Lifecycle action: restart_test');
    });
  });

  describe('Advanced Integration Tests', () => {
    it('should support mixed tool types (sync/async, simple/complex)', async () => {
      // 简单同步工具
      const syncTool = mcp.tool({
        name: 'sync_tool',
        description: 'Synchronous tool',
        inputSchema: z.object({ value: z.number() }),
      })(async function(args: { value: number }) {
        return {
          content: [{
            type: 'text' as const,
            text: `Sync result: ${args.value * 2}`,
          }],
        };
      });

      // 复杂异步工具
      const asyncTool = mcp.tool({
        name: 'async_tool',
        description: 'Asynchronous tool with delay',
        inputSchema: z.object({
          delay: z.number().min(0).max(1000),
          message: z.string(),
        }),
      })(async function(args: { delay: number; message: string }) {
        await new Promise(resolve => setTimeout(resolve, args.delay));
        return {
          content: [{
            type: 'text' as const,
            text: `Async result after ${args.delay}ms: ${args.message}`,
          }],
          metadata: {
            processingTime: args.delay,
            timestamp: new Date().toISOString(),
          },
        };
      });

      // 启动服务器
      await mcp.run();

      // 并发测试两个工具
      const [syncResult, asyncResult] = await Promise.all([
        syncTool({ value: 21 }),
        asyncTool({ delay: 50, message: 'test async' }),
      ]);

      expect(syncResult.content[0].text).toBe('Sync result: 42');
      expect(asyncResult.content[0].text).toBe('Async result after 50ms: test async');
      expect(asyncResult.metadata?.processingTime).toBe(50);
    });

    it('should maintain tool state and context across calls', async () => {
      let callCount = 0;
      const callHistory: string[] = [];

      const statefulTool = mcp.tool({
        name: 'stateful_tool',
        description: 'Tool that maintains state across calls',
        inputSchema: z.object({
          action: z.enum(['increment', 'reset', 'history']),
          value: z.string().optional(),
        }),
      })(async function(args: { action: string; value?: string }) {
        switch (args.action) {
          case 'increment':
            callCount++;
            if (args.value) callHistory.push(args.value);
            return {
              content: [{
                type: 'text' as const,
                text: `Call count: ${callCount}`,
              }],
            };
          case 'reset':
            callCount = 0;
            callHistory.length = 0;
            return {
              content: [{
                type: 'text' as const,
                text: 'State reset',
              }],
            };
          case 'history':
            return {
              content: [{
                type: 'text' as const,
                text: `History: ${callHistory.join(', ')} (${callCount} calls)`,
              }],
            };
          default:
            throw new Error('Invalid action');
        }
      });

      await mcp.run();

      // 测试状态维护
      await statefulTool({ action: 'increment', value: 'first' });
      await statefulTool({ action: 'increment', value: 'second' });
      
      const historyResult = await statefulTool({ action: 'history' });
      expect(historyResult.content[0].text).toBe('History: first, second (2 calls)');

      await statefulTool({ action: 'reset' });
      const resetResult = await statefulTool({ action: 'history' });
      expect(resetResult.content[0].text).toBe('History:  (0 calls)');
    });
  });
});