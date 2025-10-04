# FastMCP 技术文档

## 项目概述

FastMCP 是一个基于 JavaScript/TypeScript 的 Model Context Protocol (MCP) 服务器实现框架。它提供了一套简洁而强大的装饰器系统，让开发者能够快速构建 MCP 服务器，支持工具（Tools）、资源（Resources）和提示（Prompts）三种核心功能。

### 核心特性

- 🚀 **装饰器模式**：使用 `@tool`、`@resource`、`@prompt` 装饰器快速定义功能
- 🔒 **内置验证**：基于 Zod 的输入输出验证
- 📘 **TypeScript 支持**：完整的类型安全和智能提示
- 🔌 **多传输层**：支持 stdio、HTTP、WebSocket 等传输方式
- 📚 **丰富示例**：提供计算器、文件系统、提示生成等完整示例
- 🧪 **测试覆盖**：使用 Jest 进行全面测试

## 项目架构

### 目录结构

```
src/
├── core/           # 核心 FastMCP 实现
│   └── fastmcp.ts  # 主要的 FastMCP 类
├── decorators/     # 装饰器系统
│   └── index.ts    # 装饰器实现和元数据管理
├── transport/      # 传输层实现
├── types/          # TypeScript 类型定义
│   └── index.ts    # 核心类型和接口
├── utils/          # 工具函数
│   ├── logger.ts   # Winston 日志系统
│   └── validation.ts # 名称验证工具
├── examples/       # 示例服务器
│   ├── calculator.ts
│   ├── filesystem.ts
│   ├── prompts.ts
│   └── comprehensive.ts
├── cli.ts          # CLI 实现
└── index.ts        # 主入口点
```

### 核心组件

1. **FastMCP 类**：主要的服务器类，负责注册和管理所有功能
2. **装饰器系统**：提供 `@tool`、`@resource`、`@prompt` 装饰器
3. **注册表**：存储和管理所有注册的工具、资源和提示
4. **传输层**：处理与 MCP 客户端的通信
5. **验证系统**：基于 Zod 的输入验证和名称规范检查

## 装饰器模式实现

### 1. 装饰器系统架构

FastMCP 的装饰器系统是其核心特性，它通过以下方式实现：

#### 元数据存储机制

```typescript
// src/decorators/index.ts
const TOOLS_METADATA_KEY = Symbol('fastmcp:tools');
const RESOURCES_METADATA_KEY = Symbol('fastmcp:resources');
const PROMPTS_METADATA_KEY = Symbol('fastmcp:prompts');
```

装饰器使用 Symbol 作为键来存储元数据，避免命名冲突并提供私有性。

#### 装饰器工厂模式

每个装饰器都是一个装饰器工厂，返回实际的装饰器函数：

```typescript
export function tool(config: { 
  name: string; 
  description?: string; 
  inputSchema?: z.ZodType 
}): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    // 装饰器逻辑
  };
}
```

### 2. @tool 装饰器实现

#### 核心实现

```typescript
export function tool(config: { 
  name: string; 
  description?: string; 
  inputSchema?: z.ZodType 
}): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    // 在类构造函数上创建 _tools Map（如果不存在）
    if (!target.constructor._tools) {
      target.constructor._tools = new Map();
    }
    
    // 存储工具元数据
    target.constructor._tools.set(propertyKey, {
      name: config.name,
      description: config.description,
      inputSchema: config.inputSchema,
      handler: descriptor.value, // 原始方法作为处理器
    });
  };
}
```

#### 技术细节解析

1. **target 参数**：在类方法装饰器中，`target` 指向类的原型对象（`MyClass.prototype`）
2. **target.constructor**：通过原型的 constructor 属性获取类本身，用于存储元数据
3. **propertyKey**：被装饰的方法名
4. **descriptor.value**：原始的方法函数，作为工具的处理器

#### 使用示例

```typescript
class CalculatorServer {
  @tool({
    name: 'add',
    description: 'Add two numbers',
    inputSchema: Schema.object({
      a: Schema.number(),
      b: Schema.number()
    })
  })
  async add(args: { a: number; b: number }) {
    return {
      content: [{
        type: 'text' as const,
        text: `Result: ${args.a + args.b}`
      }]
    };
  }
}
```

### 3. @resource 装饰器实现

#### 核心实现

```typescript
export function resource(config: { 
  uri: string; 
  name?: string; 
  description?: string 
}): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    if (!target.constructor._resources) {
      target.constructor._resources = new Map();
    }
    
    target.constructor._resources.set(propertyKey, {
      uri: config.uri,
      name: config.name,
      description: config.description,
      handler: descriptor.value,
    });
  };
}
```

#### 使用示例

```typescript
class FileServer {
  @resource({
    uri: 'file://config.json',
    name: 'Configuration File',
    description: 'Application configuration'
  })
  async getConfig() {
    return {
      contents: [{
        uri: 'file://config.json',
        mimeType: 'application/json',
        text: JSON.stringify({ version: '1.0.0' })
      }]
    };
  }
}
```

### 4. @prompt 装饰器实现

#### 核心实现

```typescript
export function prompt(config: { 
  name: string; 
  description?: string; 
  arguments?: Array<{ name: string; description?: string; required?: boolean }> 
}): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    if (!target.constructor._prompts) {
      target.constructor._prompts = new Map();
    }
    
    target.constructor._prompts.set(propertyKey, {
      name: config.name,
      description: config.description,
      arguments: config.arguments,
      handler: descriptor.value,
    });
  };
}
```

#### 使用示例

```typescript
class PromptServer {
  @prompt({
    name: 'code_review',
    description: 'Generate a code review prompt',
    arguments: [{
      name: 'code',
      description: 'The code to review',
      required: true
    }]
  })
  async codeReview(args: { code: string }) {
    return {
      description: 'Code review prompt',
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Please review this code:\n\n${args.code}`
        }
      }]
    };
  }
}
```

## 元数据注册机制

### 1. 注册流程

FastMCP 的注册机制分为两个阶段：

#### 阶段1：装饰器收集元数据

```typescript
// 装饰器在类定义时执行，收集元数据到类构造函数上
@tool({ name: 'example' })
async exampleMethod() { /* ... */ }
// 此时元数据存储在 MyClass._tools Map 中
```

#### 阶段2：FastMCP 注册实例

```typescript
// src/core/fastmcp.ts
register(instance: any): void {
  const constructor = instance.constructor;
  
  // 注册工具
  if (constructor._tools) {
    for (const [methodName, toolMeta] of constructor._tools) {
      this.registerTool(
        toolMeta.name,
        toolMeta.handler.bind(instance), // 绑定实例上下文
        {
          description: toolMeta.description,
          inputSchema: toolMeta.inputSchema,
        }
      );
    }
  }
  
  // 注册资源和提示的逻辑类似...
}
```

### 2. 关键技术点

#### 方法绑定

```typescript
toolMeta.handler.bind(instance)
```

这行代码确保装饰器收集的方法在执行时有正确的 `this` 上下文，指向实际的类实例。

#### 延迟注册模式

装饰器只收集元数据，不立即注册到 MCP 服务器。这种模式的优势：

1. **灵活性**：允许在运行时动态注册多个实例
2. **性能**：避免装饰器执行时的重复工作
3. **可测试性**：便于单元测试和模拟

## 高阶函数模拟装饰器

FastMCP 还支持高阶函数形式的装饰器，用于普通函数：

```typescript
// 高阶函数形式
const myTool = tool({ name: 'test' })(function() {
  // 工具逻辑
});

// 等价于类方法装饰器
class MyClass {
  @tool({ name: 'test' })
  myMethod() {
    // 工具逻辑
  }
}
```

这种设计使得 FastMCP 既支持面向对象的类装饰器，也支持函数式编程风格。

## 验证系统

### 1. 输入验证

FastMCP 使用 Zod 进行输入验证：

```typescript
// src/core/fastmcp.ts
const validatedArgs = toolMeta.schema.inputSchema.parse(args);
```

### 2. 名称验证

```typescript
// src/utils/validation.ts
export function validateName(name: string): void {
  // 基础验证
  if (!name || typeof name !== 'string' || name.trim() === '') {
    throw new Error('名称不能为空');
  }
  
  if (name.length > 100) {
    throw new Error('名称长度不能超过100个字符');
  }
  
  // 特殊字符检查
  const specialChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (specialChars.test(name)) {
    throw new Error('名称不能包含特殊字符');
  }
  
  // 中文名称规范检查
  const chineseChars = /[\u4e00-\u9fff]/;
  if (chineseChars.test(name)) {
    if (/\s/.test(name)) {
      throw new Error('中文名称不能包含空格');
    }
    if (/[\r\n]/.test(name)) {
      throw new Error('中文名称不能包含换行符');
    }
  }
}
```

## 日志系统

FastMCP 使用 Winston 实现专业的日志系统：

```typescript
// src/utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});
```

## 完整使用示例

### 基础服务器

```typescript
import { FastMCP, tool, resource, prompt, Schema } from 'fastmcp';

class MyServer {
  private data = new Map<string, any>();

  @tool({
    name: 'store_value',
    description: 'Store a key-value pair',
    inputSchema: Schema.object({
      key: Schema.string(),
      value: Schema.string()
    })
  })
  async storeValue(args: { key: string; value: string }) {
    this.data.set(args.key, args.value);
    return {
      content: [{
        type: 'text' as const,
        text: `Stored ${args.key} = ${args.value}`
      }]
    };
  }

  @resource({
    uri: 'memory://data',
    name: 'Stored Data',
    description: 'All stored key-value pairs'
  })
  async getData() {
    return {
      contents: [{
        uri: 'memory://data',
        mimeType: 'application/json',
        text: JSON.stringify(Object.fromEntries(this.data))
      }]
    };
  }

  @prompt({
    name: 'data_summary',
    description: 'Generate a summary of stored data',
    arguments: [{
      name: 'format',
      description: 'Output format',
      required: false
    }]
  })
  async dataSummary(args: { format?: string }) {
    const count = this.data.size;
    const keys = Array.from(this.data.keys()).join(', ');
    
    return {
      description: 'Data summary prompt',
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Summarize this data: ${count} items with keys: ${keys}`
        }
      }]
    };
  }
}

// 创建并运行服务器
const server = new FastMCP({
  name: 'my-server',
  version: '1.0.0',
  logging: {
    level: 'info',
    format: 'simple'
  }
});

server.register(new MyServer());
server.run();
```

### 高级配置

```typescript
const server = new FastMCP({
  name: 'advanced-server',
  version: '2.0.0',
  logging: {
    level: 'debug',
    format: 'json',
    prefix: 'MyApp'
  },
  transport: {
    type: 'http',
    port: 3000,
    host: 'localhost'
  }
});
```

## 类型系统

FastMCP 提供了完整的 TypeScript 类型定义：

```typescript
// src/types/index.ts
export interface ToolMetadata {
  name: string;
  description?: string;
  inputSchema?: z.ZodType;
  handler: ToolHandler;
}

export interface ResourceMetadata {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
  handler: ResourceHandler;
}

export interface PromptMetadata {
  name: string;
  description?: string;
  arguments?: any;
  handler: PromptHandler;
}

export interface ExecutionContext {
  requestId: string;
  timestamp: Date;
  cancel: AbortSignal;
}
```

## 测试策略

FastMCP 采用全面的测试策略：

### 1. 单元测试

```typescript
// tests/decorators.test.ts
describe('Tool Decorator', () => {
  it('should register tool metadata', () => {
    class TestServer {
      @tool({ name: 'test' })
      async testMethod() { /* ... */ }
    }
    
    expect(TestServer._tools).toBeDefined();
    expect(TestServer._tools.get('testMethod')).toMatchObject({
      name: 'test'
    });
  });
});
```

### 2. 集成测试

```typescript
// tests/integration.test.ts
describe('FastMCP Integration', () => {
  it('should register and execute tools', async () => {
    const server = new FastMCP({ name: 'test' });
    server.register(new TestServer());
    
    // 测试工具注册和执行
  });
});
```

## 性能优化

### 1. 延迟加载

装饰器元数据只在需要时才注册到 MCP 服务器，避免启动时的性能开销。

### 2. 内存管理

使用 Map 数据结构存储元数据，提供 O(1) 的查找性能。

### 3. 错误处理

```typescript
try {
  const result = await toolMeta.handler(validatedArgs, context);
  return result;
} catch (error) {
  this.logger.error(`Tool execution error: ${name}`, error);
  return {
    content: [{
      type: 'text' as const,
      text: `Error: ${error instanceof Error ? error.message : String(error)}`
    }],
    isError: true
  };
}
```

## 扩展性设计

### 1. 插件系统

FastMCP 的架构支持插件扩展：

```typescript
interface Plugin {
  name: string;
  install(server: FastMCP): void;
}

class MyPlugin implements Plugin {
  name = 'my-plugin';
  
  install(server: FastMCP) {
    // 扩展服务器功能
  }
}
```

### 2. 自定义传输层

```typescript
interface Transport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: any): Promise<void>;
}
```

## 最佳实践

### 1. 装饰器使用

- 为每个工具提供清晰的名称和描述
- 使用 Zod schema 进行输入验证
- 保持方法职责单一

### 2. 错误处理

- 在工具方法中进行适当的错误处理
- 返回有意义的错误信息
- 使用日志记录错误详情

### 3. 性能考虑

- 避免在装饰器方法中执行耗时操作
- 合理使用缓存机制
- 监控内存使用情况

## 总结

FastMCP 通过创新的装饰器模式实现，为 JavaScript/TypeScript 开发者提供了一个简洁而强大的 MCP 服务器开发框架。其核心特点包括：

1. **装饰器驱动**：使用 `@tool`、`@resource`、`@prompt` 装饰器简化开发
2. **元数据管理**：通过 Symbol 键和延迟注册实现高效的元数据管理
3. **类型安全**：完整的 TypeScript 支持和 Zod 验证
4. **可扩展性**：模块化架构支持插件和自定义扩展
5. **生产就绪**：包含日志、错误处理、测试等生产环境必需功能

这种设计使得开发者能够专注于业务逻辑的实现，而不需要关心底层的 MCP 协议细节，大大提高了开发效率和代码质量。