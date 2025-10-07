# FastJsMcp

一个快速简单的 Model Context Protocol (MCP) 服务器实现，支持 JavaScript/TypeScript。

[English Documentation](./docs/README-en.md)

## ✨ 特性

- 🚀 **易用的装饰器系统** - 使用 `@tool`、`@resource`、`@prompt`、`@fastMcp` 装饰器快速定义功能
- 🔒 **内置验证** - 基于 Zod 的强大模式验证
- 📘 **完整的 TypeScript 支持** - 类型安全和智能提示
- 🔌 **多种传输层** - 支持 stdio、HTTP、WebSocket、SSE
- 📚 **丰富的示例** - 包含计算器、文件系统、提示生成等完整示例
- 🧪 **完善的测试** - 使用 Jest 测试套件确保代码质量
- ⚡ **TypeScript 原生支持** - 直接运行 `.ts` 文件，无需预编译
- 🛠️ **强大的 CLI 工具** - `fastjsmcp` 命令行工具，支持开发和调试

## 📦 安装

```bash
npm install fastjsmcp
# 或
pnpm add fastjsmcp
# 或
yarn add fastjsmcp
```

## 🚀 快速开始

### 使用类装饰器

```typescript
import { fastMcp, tool, resource, prompt, Schema, TransportType } from 'fastjsmcp';

@fastMcp({
  name: 'my-server',
  version: '1.0.0',
  transport: {
    type: TransportType.Streamable,
    port: 3000,
    host: 'localhost',
    endpoint: '/mcp',
  },
})
class MyServer {
  @tool({
    name: 'calculate',
    description: '执行基本的数学运算',
    inputSchema: Schema.object({
      operation: Schema.enum(['add', 'subtract', 'multiply', 'divide']),
      a: Schema.number().describe('第一个数字'),
      b: Schema.number().describe('第二个数字')
    })
  })
  async calculate(args: { operation: string; a: number; b: number }) {
    const { operation, a, b } = args;
    let result: number;
    
    switch (operation) {
      case 'add': result = a + b; break;
      case 'subtract': result = a - b; break;
      case 'multiply': result = a * b; break;
      case 'divide': 
        if (b === 0) throw new Error('除零错误');
        result = a / b; 
        break;
      default: throw new Error(`未知操作: ${operation}`);
    }
    
    return {
      content: [{ type: 'text', text: `结果: ${result}` }]
    };
  }

  @resource({
    uri: 'memory://data',
    name: '内存数据',
    description: '访问存储在内存中的数据'
  })
  async getMemoryData() {
    return {
      contents: [{
        uri: 'memory://data',
        mimeType: 'application/json',
        text: JSON.stringify({ message: '来自内存的问候!' })
      }]
    };
  }

  @prompt({
    name: 'code_review',
    description: '生成代码审查提示',
    arguments: [{
      name: 'code',
      description: '要审查的代码',
      required: true
    }]
  })
  async codeReview(args: { code: string }) {
    return {
      description: '代码审查提示',
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `请审查以下代码并提供反馈：\n\n${args.code}`
        }
      }]
    };
  }
}
```

### 使用实例方法

```typescript
import { FastMCP, Schema } from 'fastjsmcp';

const server = new FastMCP({
  name: 'my-server',
  version: '1.0.0'
});

// 注册工具
server.registerTool('add', async (args) => {
  return {
    content: [{ type: 'text', text: `结果: ${args.a + args.b}` }]
  };
}, Schema.object({
  a: Schema.number(),
  b: Schema.number()
}));

// 注册并运行服务器
server.run();
```

## 🛠️ CLI 使用

FastMCP 提供了强大的命令行工具：

### 基本命令

```bash
# 列出可用的示例服务器
fastjsmcp list

# 运行内置示例服务器
fastjsmcp run --server calculator
fastjsmcp run --server filesystem
fastjsmcp run --server prompts
fastjsmcp run --server comprehensive

# 运行自定义服务器文件（支持 TypeScript）
fastjsmcp run ./my-server.ts
fastjsmcp run ./my-server.js

# 使用不同的传输层
fastjsmcp run --server calculator --transport streamable --port 3000
fastjsmcp run --server filesystem --transport stdio
```

### 调试和检查

```bash
# 启动 MCP Inspector 进行调试
fastjsmcp inspect ./my-server.ts
fastjsmcp inspect ./my-server.js --port 6274

# 使用配置文件
fastjsmcp inspect ./server.ts --config ./inspector.json
```

### CLI 选项

| 选项 | 描述 | 默认值 |
|------|------|--------|
| `-s, --server <type>` | 服务器类型 (calculator, filesystem, prompts, comprehensive) | calculator |
| `-t, --transport <type>` | 传输类型 (stdio, http, websocket) | stdio |
| `-p, --port <port>` | HTTP/WebSocket 端口 | 3000 |
| `-h, --host <host>` | HTTP/WebSocket 主机 | localhost |
| `-l, --log-level <level>` | 日志级别 (error, warn, info, debug) | info |
| `--log-format <format>` | 日志格式 (simple, json) | simple |
| `-n, --name <name>` | 服务器名称 | - |
| `--server-version <version>` | 服务器版本 | 1.0.0 |

## 📖 API 参考

### 装饰器

#### `@fastMcp(options)`

类装饰器，用于自动设置和注册 MCP 服务器。

```typescript
@fastMcp({
  name: 'server-name',
  version: '1.0.0',
  transport: {
    type: TransportType.Streamable,
    port: 3000,
    host: 'localhost',
    endpoint: '/mcp'
  }
})
class MyServer {
  // 服务器实现
}
```

#### `@tool(options)`

定义可被 MCP 客户端调用的工具。

```typescript
@tool({
  name: 'tool_name',
  description: '工具描述',
  inputSchema: Schema.object({
    param: Schema.string().describe('参数描述')
  })
})
async myTool(args: { param: string }) {
  return {
    content: [{ type: 'text', text: '工具结果' }]
  };
}
```

#### `@resource(options)`

定义可被 MCP 客户端读取的资源。

```typescript
@resource({
  uri: 'scheme://path',
  name: '资源名称',
  description: '资源描述',
  mimeType: 'text/plain' // 可选
})
async myResource() {
  return {
    contents: [{
      uri: 'scheme://path',
      mimeType: 'text/plain',
      text: '资源内容'
    }]
  };
}
```

#### `@prompt(options)`

定义可被 MCP 客户端使用的提示模板。

```typescript
@prompt({
  name: 'prompt_name',
  description: '提示描述',
  arguments: [{
    name: 'arg_name',
    description: '参数描述',
    required: true
  }]
})
async myPrompt(args: { arg_name: string }) {
  return {
    description: '提示描述',
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `包含 ${args.arg_name} 的提示`
      }
    }]
  };
}
```

### Schema 验证

FastMCP 使用 Zod 进行模式验证：

```typescript
import { Schema } from 'fastjsmcp';

// 基本类型
Schema.string()
Schema.number()
Schema.boolean()
Schema.array(Schema.string())

// 对象
Schema.object({
  name: Schema.string(),
  age: Schema.number().optional(),
  tags: Schema.array(Schema.string())
})

// 枚举
Schema.enum(['选项1', '选项2', '选项3'])

// 联合类型
Schema.union([Schema.string(), Schema.number()])

// 带描述
Schema.string().describe('字符串参数的描述')
```

### FastMCP 配置选项

```typescript
const server = new FastMCP({
  name: 'server-name',
  version: '1.0.0',
  logging: {
    level: 'info', // 'error' | 'warn' | 'info' | 'debug'
    format: 'simple' // 'simple' | 'json'
  },
  transport: {
    type: 'stdio', // 'stdio' | 'http' | 'websocket'
    port: 3000, // 用于 http/websocket
    host: 'localhost' // 用于 http/websocket
  }
});
```

## 📚 示例

项目包含多个示例服务器：

### 计算器服务器
基本的数学运算功能。

```bash
fastjsmcp run --server calculator
```

### 文件系统服务器
文件操作和资源访问。

```bash
fastjsmcp run --server filesystem --base-path ./
```

### 提示服务器
AI 提示生成示例。

```bash
fastjsmcp run --server prompts
```

### 综合示例
展示所有功能的完整示例。

```bash
fastjsmcp run --server comprehensive
```

## 🔧 开发

### 环境设置

```bash
git clone <repository-url>
cd fastjsmcp
pnpm install
```

### 开发脚本

```bash
# 构建项目
pnpm build

# 开发模式（热重载）
pnpm dev

# 运行测试
pnpm test

# 监视模式测试
pnpm test:watch

# 代码检查
pnpm lint

# 修复代码风格
pnpm lint:fix

# 类型检查
pnpm check

# 清理构建文件
pnpm clean
```

### TypeScript 支持

FastMCP 完全支持 TypeScript 开发：

- 直接运行 `.ts` 文件，无需预编译
- 完整的类型定义和智能提示
- 使用 `tsx` 运行时自动处理 TypeScript 文件

```bash
# 直接运行 TypeScript 服务器
fastjsmcp run ./my-server.ts

# 调试 TypeScript 服务器
fastjsmcp inspect ./my-server.ts
```

## 🤝 贡献

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

### 贡献指南

- 为新功能添加测试
- 运行测试和代码检查
- 遵循现有的代码风格
- 更新相关文档

## 📄 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🔗 相关链接

- [Model Context Protocol 规范](https://spec.modelcontextprotocol.io/)
- [MCP SDK 文档](https://github.com/modelcontextprotocol/typescript-sdk)
- [GitHub 仓库](https://github.com/zaizaizhao/fastjsmcp)

## 🆘 支持

如果您遇到问题或有疑问：

1. 查看 [文档](./docs/)
2. 搜索 [Issues](https://github.com/zaizaizhao/fastjsmcp/issues)
3. 创建新的 Issue
4. 参与 [Discussions](https://github.com/zaizaizhao/fastjsmcp/discussions)

---

**FastJsMcp** - 让 MCP 服务器开发变得简单快捷！ 🚀