# FastMCP JavaScript版本技术架构文档

## 1. 架构设计

```mermaid
graph TD
    A[AI应用/Host] --> B[FastMCP Client SDK]
    B --> C[传输层]
    C --> D[FastMCP Server Core]
    
    D --> E[协议处理层]
    D --> F[功能管理层]
    D --> G[工具层]
    
    E --> E1[JSON-RPC Handler]
    E --> E2[消息路由器]
    E --> E3[能力协商]
    
    F --> F1[工具管理器]
    F --> F2[资源管理器]
    F --> F3[提示管理器]
    F --> F4[采样管理器]
    
    G --> G1[装饰器系统]
    G --> G2[类型验证]
    G --> G3[错误处理]
    G4[配置管理]
    G --> G5[日志系统]
    
    subgraph "传输层实现"
        C --> C1[Stdio Transport]
        C --> C2[SSE Transport]
        C --> C3[HTTP Transport]
        C --> C4[WebSocket Transport]
    end
    
    subgraph "数据层"
        H[本地文件系统]
        I[数据库]
        J[外部API]
        K[缓存系统]
    end
    
    F2 --> H
    F1 --> I
    F1 --> J
    D --> K
```

## 2. 技术描述

**核心技术栈：**
- 前端SDK：TypeScript + @modelcontextprotocol/sdk
- 服务器核心：Node.js 18+ + TypeScript 5.0+
- 协议支持：JSON-RPC 2.0
- 类型验证：Zod + JSON Schema
- 装饰器支持：reflect-metadata
- 日志系统：Winston
- 测试框架：Jest + Supertest
- 构建工具：TypeScript Compiler + ESBuild

**可选依赖：**
- 配置管理：dotenv
- 进程管理：PM2
- 监控：Prometheus + Grafana
- 容器化：Docker

## 3. 路由定义

| 路由类型 | 路径/方法 | 用途 |
|----------|-----------|------|
| JSON-RPC | initialize | 初始化连接和能力协商 |
| JSON-RPC | tools/list | 获取可用工具列表 |
| JSON-RPC | tools/call | 执行指定工具 |
| JSON-RPC | resources/list | 获取可用资源列表 |
| JSON-RPC | resources/read | 读取指定资源内容 |
| JSON-RPC | prompts/list | 获取可用提示模板列表 |
| JSON-RPC | prompts/get | 获取指定提示模板 |
| JSON-RPC | sampling/createMessage | 创建采样消息 |
| HTTP | /health | 健康检查端点 |
| HTTP | /metrics | 监控指标端点 |
| WebSocket | /ws | WebSocket连接端点 |
| SSE | /events | Server-Sent Events端点 |

## 4. API定义

### 4.1 核心服务器API

**服务器初始化**
```typescript
interface FastMCPOptions {
  name: string;
  version: string;
  capabilities?: ServerCapabilities;
  transport?: TransportOptions;
  logging?: LoggingOptions;
}

class FastMCP {
  constructor(options: FastMCPOptions);
  
  // 装饰器API
  tool(name: string, schema: ToolSchema): MethodDecorator;
  resource(uri: string, options?: ResourceOptions): MethodDecorator;
  prompt(name: string, template: PromptTemplate): MethodDecorator;
  
  // 程序化API
  registerTool(name: string, handler: ToolHandler, schema: ToolSchema): void;
  registerResource(uri: string, handler: ResourceHandler): void;
  registerPrompt(name: string, handler: PromptHandler): void;
  
  // 生命周期管理
  async run(transport?: TransportType): Promise<void>;
  async stop(): Promise<void>;
  async restart(): Promise<void>;
}
```

**工具定义API**
```typescript
interface ToolSchema {
  description: string;
  inputSchema: JSONSchema7;
  outputSchema?: JSONSchema7;
  examples?: ToolExample[];
}

interface ToolHandler {
  (params: any, context?: ExecutionContext): Promise<ToolResult>;
}

interface ToolResult {
  content: ContentBlock[];
  isError?: boolean;
  metadata?: Record<string, any>;
}

interface ExecutionContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  cancel: AbortSignal;
}
```

**资源定义API**
```typescript
interface ResourceHandler {
  (uri: string, params?: Record<string, any>): Promise<ResourceContent>;
}

interface ResourceContent {
  contents: ResourceContentBlock[];
  metadata?: Record<string, any>;
}

interface ResourceContentBlock {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: Uint8Array;
}
```

### 4.2 传输层API

**传输接口定义**
```typescript
interface Transport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: JSONRPCMessage): Promise<void>;
  onMessage(handler: (message: JSONRPCMessage) => void): void;
  onError(handler: (error: Error) => void): void;
  onClose(handler: () => void): void;
}

interface TransportOptions {
  type: 'stdio' | 'sse' | 'http' | 'websocket';
  options?: Record<string, any>;
}
```

**HTTP传输配置**
```typescript
interface HTTPTransportOptions {
  port?: number;
  host?: string;
  cors?: CORSOptions;
  auth?: AuthOptions;
  tls?: TLSOptions;
}

interface CORSOptions {
  origin?: string | string[];
  methods?: string[];
  allowedHeaders?: string[];
}
```

### 4.3 客户端API

**客户端连接**
```typescript
class FastMCPClient {
  constructor(transport: Transport);
  
  async connect(): Promise<void>;
  async disconnect(): Promise<void>;
  
  // 工具操作
  async listTools(): Promise<Tool[]>;
  async callTool(name: string, params: any): Promise<ToolResult>;
  
  // 资源操作
  async listResources(): Promise<Resource[]>;
  async readResource(uri: string): Promise<ResourceContent>;
  
  // 提示操作
  async listPrompts(): Promise<Prompt[]>;
  async getPrompt(name: string, params?: any): Promise<PromptResult>;
}
```

## 5. 服务器架构图

```mermaid
graph TD
    A[HTTP/WebSocket/Stdio 请求] --> B[传输层适配器]
    B --> C[协议解析器]
    C --> D[消息路由器]
    D --> E[请求验证器]
    E --> F[业务逻辑层]
    
    F --> G[工具执行器]
    F --> H[资源处理器]
    F --> I[提示处理器]
    F --> J[采样处理器]
    
    G --> K[装饰器元数据]
    G --> L[参数验证]
    G --> M[异步执行]
    
    H --> N[资源缓存]
    H --> O[文件系统]
    H --> P[数据库连接]
    
    M --> Q[结果序列化]
    N --> Q
    P --> Q
    
    Q --> R[响应格式化]
    R --> S[传输层适配器]
    S --> T[客户端响应]
    
    subgraph "中间件层"
        U[认证中间件]
        V[日志中间件]
        W[错误处理中间件]
        X[限流中间件]
    end
    
    B --> U
    U --> V
    V --> W
    W --> X
    X --> C
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    SERVER ||--o{ TOOL : defines
    SERVER ||--o{ RESOURCE : exposes
    SERVER ||--o{ PROMPT : provides
    SERVER ||--o{ SESSION : manages
    
    TOOL ||--o{ TOOL_EXECUTION : executes
    RESOURCE ||--o{ RESOURCE_ACCESS : accesses
    SESSION ||--o{ REQUEST : handles
    
    SERVER {
        string id PK
        string name
        string version
        json capabilities
        timestamp created_at
        timestamp updated_at
    }
    
    TOOL {
        string id PK
        string server_id FK
        string name
        string description
        json input_schema
        json output_schema
        json metadata
        timestamp created_at
    }
    
    RESOURCE {
        string id PK
        string server_id FK
        string uri
        string name
        string description
        string mime_type
        json metadata
        timestamp created_at
    }
    
    PROMPT {
        string id PK
        string server_id FK
        string name
        string description
        json template
        json arguments
        timestamp created_at
    }
    
    SESSION {
        string id PK
        string server_id FK
        string client_id
        json capabilities
        string status
        timestamp created_at
        timestamp last_activity
    }
    
    TOOL_EXECUTION {
        string id PK
        string tool_id FK
        string session_id FK
        json input_params
        json output_result
        string status
        integer duration_ms
        timestamp executed_at
    }
    
    RESOURCE_ACCESS {
        string id PK
        string resource_id FK
        string session_id FK
        string uri
        integer content_length
        timestamp accessed_at
    }
    
    REQUEST {
        string id PK
        string session_id FK
        string method
        json params
        json response
        string status
        integer duration_ms
        timestamp created_at
    }
```

### 6.2 数据定义语言

**内存存储结构（开发/测试环境）**
```typescript
// 服务器注册表
interface ServerRegistry {
  servers: Map<string, ServerInstance>;
  tools: Map<string, ToolDefinition>;
  resources: Map<string, ResourceDefinition>;
  prompts: Map<string, PromptDefinition>;
}

// 会话管理
interface SessionManager {
  sessions: Map<string, SessionInfo>;
  connections: Map<string, Transport>;
  
  createSession(clientId: string, capabilities: ClientCapabilities): SessionInfo;
  getSession(sessionId: string): SessionInfo | undefined;
  removeSession(sessionId: string): void;
}

// 执行上下文
interface ExecutionContext {
  requestId: string;
  sessionId: string;
  userId?: string;
  startTime: Date;
  timeout?: number;
  abortController: AbortController;
}
```

**持久化存储（生产环境）**
```sql
-- 服务器配置表
CREATE TABLE mcp_servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    capabilities JSONB NOT NULL,
    config JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 工具定义表
CREATE TABLE mcp_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    input_schema JSONB NOT NULL,
    output_schema JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(server_id, name)
);

-- 资源定义表
CREATE TABLE mcp_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE,
    uri VARCHAR(500) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    mime_type VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(server_id, uri)
);

-- 会话表
CREATE TABLE mcp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE,
    client_id VARCHAR(255) NOT NULL,
    capabilities JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 执行日志表
CREATE TABLE mcp_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES mcp_sessions(id) ON DELETE CASCADE,
    tool_id UUID REFERENCES mcp_tools(id),
    resource_id UUID REFERENCES mcp_resources(id),
    method VARCHAR(50) NOT NULL,
    input_params JSONB,
    output_result JSONB,
    status VARCHAR(20) NOT NULL,
    duration_ms INTEGER,
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_mcp_tools_server_id ON mcp_tools(server_id);
CREATE INDEX idx_mcp_resources_server_id ON mcp_resources(server_id);
CREATE INDEX idx_mcp_sessions_server_id ON mcp_sessions(server_id);
CREATE INDEX idx_mcp_sessions_status ON mcp_sessions(status);
CREATE INDEX idx_mcp_executions_session_id ON mcp_executions(session_id);
CREATE INDEX idx_mcp_executions_executed_at ON mcp_executions(executed_at DESC);

-- 初始化数据
INSERT INTO mcp_servers (name, version, capabilities) VALUES 
('demo-server', '1.0.0', '{"tools": {}, "resources": {}, "prompts": {}}');
```

**缓存层设计（Redis）**
```typescript
// 缓存键命名规范
interface CacheKeys {
  SERVER_CONFIG: `server:${serverId}:config`;
  TOOL_DEFINITION: `tool:${serverId}:${toolName}`;
  RESOURCE_CONTENT: `resource:${serverId}:${resourceUri}`;
  SESSION_INFO: `session:${sessionId}`;
  EXECUTION_RESULT: `execution:${executionId}:result`;
}

// 缓存管理器
class CacheManager {
  private redis: Redis;
  
  async setServerConfig(serverId: string, config: ServerConfig, ttl = 3600): Promise<void>;
  async getServerConfig(serverId: string): Promise<ServerConfig | null>;
  
  async setToolDefinition(serverId: string, toolName: string, definition: ToolDefinition): Promise<void>;
  async getToolDefinition(serverId: string, toolName: string): Promise<ToolDefinition | null>;
  
  async cacheResourceContent(serverId: string, uri: string, content: ResourceContent, ttl = 1800): Promise<void>;
  async getCachedResourceContent(serverId: string, uri: string): Promise<ResourceContent | null>;
}
```

## 7. 部署架构

### 7.1 开发环境
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  fastmcp-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "3000:3000"
      - "9229:9229"  # Debug port
    environment:
      - NODE_ENV=development
      - DEBUG=fastmcp:*
    command: npm run dev
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: fastmcp_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 7.2 生产环境
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  fastmcp:
    image: fastmcp:latest
    restart: unless-stopped
    ports:
      - "80:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://user:pass@postgres:5432/fastmcp
    depends_on:
      - redis
      - postgres
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
  
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
  
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: fastmcp
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - fastmcp

volumes:
  redis_data:
  postgres_data:
```

### 7.3 Kubernetes部署
```yaml
# k8s-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fastmcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fastmcp-server
  template:
    metadata:
      labels:
        app: fastmcp-server
    spec:
      containers:
      - name: fastmcp
        image: fastmcp:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: fastmcp-secrets
              key: redis-url
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: fastmcp-service
spec:
  selector:
    app: fastmcp-server
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```