# FastMCP Function Decorators Guide

本指南展示如何使用 FastMCP 对普通函数进行装饰，将其注册为 MCP 工具、资源和提示。

## 概述

FastMCP 提供了三种装饰器来装饰普通函数：
- `mcp.tool()` - 将函数注册为 MCP 工具
- `mcp.resource()` - 将函数注册为 MCP 资源
- `mcp.prompt()` - 将函数注册为 MCP 提示

## 基本用法

### 1. 工具装饰器 (Tool Decorator)

```typescript
import { FastMCP } from 'fastmcp';
import { z } from 'zod';

const mcp = new FastMCP({ name: 'My App', version: '1.0.0' });

// 使用装饰器装饰函数
const calculator = mcp.tool({
  name: 'calculator',
  description: 'Perform arithmetic operations',
  inputSchema: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number(),
  }),
})(async function(args) {
  const { operation, a, b } = args;
  let result;
  
  switch (operation) {
    case 'add': result = a + b; break;
    case 'subtract': result = a - b; break;
    case 'multiply': result = a * b; break;
    case 'divide': 
      if (b === 0) throw new Error('Division by zero');
      result = a / b; 
      break;
  }
  
  return {
    content: [{ type: 'text', text: `${a} ${operation} ${b} = ${result}` }]
  };
});
```

### 2. 资源装饰器 (Resource Decorator)

```typescript
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
  };
  
  return {
    contents: [{
      uri: 'system://info',
      mimeType: 'application/json',
      text: JSON.stringify(info, null, 2),
    }]
  };
});
```

### 3. 提示装饰器 (Prompt Decorator)

```typescript
const codeReviewPrompt = mcp.prompt({
  name: 'code_review',
  description: 'Generate a code review prompt',
  arguments: z.object({
    language: z.string(),
    codeSnippet: z.string(),
    focusArea: z.enum(['performance', 'security', 'readability']),
  }),
})(async function(params) {
  const { language, codeSnippet, focusArea } = params;
  
  return {
    description: `Code review for ${language} focusing on ${focusArea}`,
    messages: [{
      role: 'user',
      content: [{
        type: 'text',
        text: `Please review this ${language} code:\n\n\`\`\`${language}\n${codeSnippet}\n\`\`\``,
      }],
    }],
  };
});
```

## 手动注册方式

除了使用装饰器，你也可以手动注册函数：

```typescript
// 定义普通函数
async function stringUtils(args) {
  const { text, operation } = args;
  // ... 实现逻辑
  return { content: [{ type: 'text', text: result }] };
}

// 手动注册
mcp.registerTool('string_utils', stringUtils, {
  description: 'String manipulation utilities',
  inputSchema: z.object({
    text: z.string(),
    operation: z.enum(['uppercase', 'lowercase', 'reverse']),
  }),
});
```

## 测试你的装饰器

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定的装饰器测试
npm test -- function-decorator.test.ts
```

### 测试文件结构

测试文件 `tests/function-decorator.test.ts` 包含以下测试用例：

1. **工具装饰器测试**
   - 基本功能测试
   - 参数验证
   - 错误处理

2. **资源装饰器测试**
   - 资源注册
   - URI 处理
   - MIME 类型设置

3. **提示装饰器测试**
   - 提示生成
   - 参数处理
   - 消息格式

4. **手动注册测试**
   - `registerTool()` 方法
   - `registerResource()` 方法
   - `registerPrompt()` 方法

5. **错误处理测试**
   - 无效参数处理
   - 异常情况处理

6. **集成测试**
   - 混合注册方式
   - 完整工作流程

### 运行示例

```bash
# 运行示例代码
npx tsx examples/function-decorator-usage.ts
```

## 最佳实践

### 1. 命名规范
- 为工具、资源和提示使用描述性名称
- 使用 snake_case 或 kebab-case 命名
- 避免使用特殊字符

### 2. Schema 定义
- 使用 Zod 定义清晰的输入 Schema
- 为每个字段添加描述
- 使用适当的验证规则

### 3. 错误处理
- 在函数中添加适当的错误处理
- 返回有意义的错误消息
- 验证输入参数

### 4. 返回格式
- 遵循 MCP 协议的返回格式
- 为工具返回 `{ content: [...] }`
- 为资源返回 `{ contents: [...] }`
- 为提示返回 `{ description, messages }`

## 常见问题

### Q: 匿名函数如何处理名称？
A: FastMCP 会自动为匿名函数生成唯一名称，格式为 `tool_timestamp_randomstring`。

### Q: 可以同时使用装饰器和手动注册吗？
A: 是的，两种方式可以混合使用，但要避免重复注册相同名称的工具。

### Q: 如何调试装饰器问题？
A: 运行测试文件可以帮助识别问题，同时查看控制台输出的注册信息。

## 相关文件

- `tests/function-decorator.test.ts` - 完整的测试套件
- `examples/function-decorator-usage.ts` - 使用示例
- `src/core/fastmcp.ts` - 核心实现代码