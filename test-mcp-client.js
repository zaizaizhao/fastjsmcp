// MCP 客户端测试脚本
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const http = require('http');
const https = require('https');

const SERVER_URL = 'http://localhost:4006/mcp';

class MCPClient {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.sessionId = null;
  }

  async initialize() {
    console.log('正在初始化 MCP 连接...');
    
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    };

    try {
      const result = await this.makeRequest(initRequest);
      
      // 获取 session ID
      this.sessionId = result.sessionId;
      console.log('Session ID:', this.sessionId);
      console.log('初始化响应:', JSON.stringify(result.data, null, 2));
      
      return result.data;
    } catch (error) {
      console.error('初始化失败:', error);
      throw error;
    }
  }

  async listTools() {
    if (!this.sessionId) {
      throw new Error('必须先初始化连接');
    }

    console.log('正在获取工具列表...');
    
    const listRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };

    try {
      const result = await this.makeRequest(listRequest, this.sessionId);
      console.log('工具列表响应:', JSON.stringify(result.data, null, 2));
      
      return result.data;
    } catch (error) {
      console.error('获取工具列表失败:', error);
      throw error;
    }
  }

  async callTool(toolName, args = {}) {
    if (!this.sessionId) {
      throw new Error('必须先初始化连接');
    }

    console.log(`正在调用工具: ${toolName}`);
    
    const callRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    try {
      const result = await this.makeRequest(callRequest, this.sessionId);
      console.log(`工具 ${toolName} 调用结果:`, JSON.stringify(result.data, null, 2));
      
      return result.data;
    } catch (error) {
      console.error(`调用工具 ${toolName} 失败:`, error);
      throw error;
    }
  }

  async makeRequest(requestData, sessionId = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.serverUrl);
      const postData = JSON.stringify(requestData);
      
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      if (sessionId) {
        options.headers['mcp-session-id'] = sessionId;
      }

      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const responseSessionId = res.headers['mcp-session-id'];
            
            // 检查是否是 SSE 响应
            if (res.headers['content-type']?.includes('text/event-stream')) {
              // 解析 SSE 数据
              const events = this.parseSSE(data);
              const messageEvent = events.find(event => event.event === 'message');
              
              if (messageEvent) {
                const jsonData = JSON.parse(messageEvent.data);
                resolve({
                  data: jsonData,
                  sessionId: responseSessionId,
                  statusCode: res.statusCode
                });
              } else {
                reject(new Error('未找到消息事件'));
              }
            } else {
              // 尝试解析为 JSON
              const jsonData = JSON.parse(data);
              resolve({
                data: jsonData,
                sessionId: responseSessionId,
                statusCode: res.statusCode
              });
            }
          } catch (error) {
            reject(new Error(`解析响应失败: ${error.message}\n原始数据: ${data.substring(0, 200)}...`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  parseSSE(data) {
    const events = [];
    const lines = data.split('\n');
    let currentEvent = {};
    
    for (const line of lines) {
      if (line.trim() === '') {
        if (Object.keys(currentEvent).length > 0) {
          events.push(currentEvent);
          currentEvent = {};
        }
        continue;
      }
      
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      
      const field = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      
      if (field === 'event') {
        currentEvent.event = value;
      } else if (field === 'data') {
        currentEvent.data = value;
      } else if (field === 'id') {
        currentEvent.id = value;
      }
    }
    
    // 添加最后一个事件（如果存在）
    if (Object.keys(currentEvent).length > 0) {
      events.push(currentEvent);
    }
    
    return events;
  }
}

async function testMCPServer() {
  const client = new MCPClient(SERVER_URL);
  
  try {
    // 1. 初始化连接
    await client.initialize();
    
    // 2. 获取工具列表
    const toolsResult = await client.listTools();
    
    if (toolsResult.result && toolsResult.result.tools) {
      console.log(`\n发现 ${toolsResult.result.tools.length} 个工具:`);
      toolsResult.result.tools.forEach((tool, index) => {
        console.log(`${index + 1}. ${tool.name}: ${tool.description}`);
      });
      
      // 3. 测试调用第一个工具（如果存在）
      if (toolsResult.result.tools.length > 0) {
        const firstTool = toolsResult.result.tools[0];
        console.log(`\n测试调用工具: ${firstTool.name}`);
        
        // 根据工具的 inputSchema 构造参数
        let testArgs = {};
        if (firstTool.name === 'generate_project_spec_tool') {
          testArgs = { content: 'test project', name: 'TestProject' };
        } else if (firstTool.name === 'generate_project_tasks_tool') {
          testArgs = { content: 'test project' };
        }
        
        await client.callTool(firstTool.name, testArgs);
      }
    } else {
      console.log('\n❌ 没有发现任何工具！');
    }
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
testMCPServer();