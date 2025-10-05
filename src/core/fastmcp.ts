import 'reflect-metadata';
import { z } from 'zod';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../utils/logger.js';
import { validateName } from '../utils/index.js';
import { TransportFactory } from '../transport/index.js';
import {
  type FastMCPOptions,
  type ServerRegistry,
  type ToolHandler,
  type ResourceHandler,
  type PromptHandler,
  type ToolSchema,
  type ExecutionContext,
  type ToolDecorator,
  type ResourceDecorator,
  type PromptDecorator,
  TransportType,
} from '../types/index.js';
import {
  getToolsMetadata,
  getResourcesMetadata,
  getPromptsMetadata,
  setGlobalFastMCPInstance,
  tool as coreToolDecorator,
  resource as coreResourceDecorator,
  prompt as corePromptDecorator,
} from '../decorators/index.js';
import { startStreamableMcpServer } from '../transport/streamable.js';
import zodToJsonSchema from 'zod-to-json-schema';

export class FastMCP {
  private server: Server;
  private registry: ServerRegistry;
  private logger: Logger;
  private options: FastMCPOptions;
  private transport?: any;
  private isRunning = false;
  private shutdownPromise?: Promise<void>;

  constructor(options: FastMCPOptions) {
    this.options = options;
    this.server = new Server(
      {
        name: options.name,
        version: options.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
          ...options.capabilities,
        },
      }
    );

    this.registry = {
      tools: new Map(),
      resources: new Map(),
      prompts: new Map(),
    };

    this.logger = new Logger({
      level: options.logging?.level || 'info',
      format: options.logging?.format || 'simple',
    });

    // Set this instance as the global instance for function decorators
    setGlobalFastMCPInstance(this);

    this.setupHandlers();
  }

  /**
   * Register a server instance with decorated methods
   */
  register(instance: any): void {
    // Register tools
    const tools = getToolsMetadata(instance.constructor);
    for (const tool of tools) {
      if (tool.name && tool.handler) {
        this.registerTool(tool.name, tool.handler.bind(instance), tool.schema);
      }
    }

    // Register resources
    const resources = getResourcesMetadata(instance.constructor);
    for (const resource of resources) {
      if (resource.uri && resource.handler) {
        this.registerResource(resource.uri, resource.handler.bind(instance), {
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
        });
      }
    }

    // Register prompts
    const prompts = getPromptsMetadata(instance.constructor);
    for (const prompt of prompts) {
      if (prompt.name && prompt.handler) {
        this.registerPrompt(prompt.name, prompt.handler.bind(instance), {
          description: prompt.description,
          arguments: prompt.arguments,
        });
      }
    }
  }

 /**
 * Instance decorator for tools - enhanced version that uses core decorator
 */
  tool: ToolDecorator = (options?) => {
    return coreToolDecorator(options || {});
  };

  /**
   * Instance decorator for resources - enhanced version that uses core decorator
   */
  resource: ResourceDecorator = (options?) => {
    return coreResourceDecorator(options || {});
  };

  /**
   * Instance decorator for prompts - enhanced version that uses core decorator
   */
  prompt: PromptDecorator = (options?) => {
    return corePromptDecorator(options || {});
  };

  /**
   * Register a tool programmatically
   */
  registerTool(name: string, handler: ToolHandler, schema: ToolSchema): void {
    if (!name || typeof name !== 'string') {
      throw new Error('Tool name must be a non-empty string');
    }
    
    // Validate tool name according to FastMCP naming rules
    validateName(name);

    if (typeof handler !== 'function') {
      throw new Error('Tool handler must be a function');
    }

    if (!schema || typeof schema !== 'object') {
      throw new Error('Tool schema must be an object');
    }

    this.registry.tools.set(name, {
      name,
      handler,
      schema,
    });

    this.logger.debug(`Registered tool: ${name}`);
  }

  /**
   * Register a resource programmatically
   */
  registerResource(
    uri: string,
    handler: ResourceHandler,
    options?: {
      name?: string;
      description?: string;
      mimeType?: string;
    }
  ): void {
    if (!uri || typeof uri !== 'string') {
      throw new Error('Resource URI must be a non-empty string');
    }

    if (typeof handler !== 'function') {
      throw new Error('Resource handler must be a function');
    }

    // Validate resource name if provided
    if (options?.name) {
      validateName(options.name);
    }

    this.registry.resources.set(uri, {
      uri,
      handler,
      name: options?.name,
      description: options?.description,
      mimeType: options?.mimeType,
    });

    this.logger.debug(`Registered resource: ${uri}`);
  }

  /**
   * Register a prompt programmatically
   */
  registerPrompt(
    name: string,
    handler: PromptHandler,
    options?: {
      description?: string;
      arguments?: any;
    }
  ): void {
    if (!name || typeof name !== 'string') {
      throw new Error('Prompt name must be a non-empty string');
    }

    // Validate prompt name according to FastMCP naming rules
    validateName(name);

    if (typeof handler !== 'function') {
      throw new Error('Prompt handler must be a function');
    }

    this.registry.prompts.set(name, {
      name,
      handler,
      description: options?.description,
      arguments: options?.arguments,
    });

    this.logger.debug(`Registered prompt: ${name}`);
  }

  //! todo:抽取
  private setupHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Array.from(this.registry.tools.values()).map(tool => ({
        name: tool.name,
        description: tool.schema.description,
        inputSchema: this.zodToJsonSchema(tool.schema.inputSchema),
      }));

      return { tools };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const tool = this.registry.tools.get(name);

      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }

      try {
        // Validate arguments using Zod schema
        const validatedArgs = tool.schema.inputSchema.parse(args || {});

        // Create execution context
        const context: ExecutionContext = {
          requestId: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          cancel: new AbortController().signal,
        };

        // Execute tool
        const result = await tool.handler(validatedArgs, context);

        // Ensure the result matches CallToolResult format
        return {
          content: result.content,
          isError: result.isError || false,
        };
      } catch (error) {
        this.logger.error(`Tool execution error for ${name}:`, error);
        throw error;
      }
    });

    // List resources handler
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = Array.from(this.registry.resources.values()).map(resource => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
      }));

      return { resources };
    });

    // Read resource handler
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      const resource = this.registry.resources.get(uri);

      if (!resource) {
        throw new Error(`Resource not found: ${uri}`);
      }

      try {
        const result = await resource.handler(uri);
        
        // Ensure the result matches ReadResourceResult format
        return {
          contents: result.contents,
        };
      } catch (error) {
        this.logger.error(`Resource read error for ${uri}:`, error);
        throw error;
      }
    });

    // List prompts handler
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const prompts = Array.from(this.registry.prompts.values()).map(prompt => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments,
      }));

      return { prompts };
    });

    // Get prompt handler
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const promptMeta = this.registry.prompts.get(name);

      if (!promptMeta) {
        throw new Error(`Prompt not found: ${name}`);
      }

      try {
        // For prompts, we don't parse arguments since they're now arrays
        const validatedArgs = args;

        const result = await promptMeta.handler(validatedArgs);
        
        // Ensure the result matches GetPromptResult format
        return {
          description: result.description,
          messages: result.messages,
        };
      } catch (error) {
        this.logger.error(`Prompt execution error for ${name}:`, error);
        throw error;
      }
    });
  }

  private zodToJsonSchema(schema: any): any {
    // Use the zodToJsonSchema function from utils (now using zod-to-json-schema library)
    return zodToJsonSchema(schema);
  }

  async run(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    try {
      // 使用配置化的传输层，默认为 stdio
      const transportOptions = this.options.transport || { type: TransportType.Stdio };
      
      if (transportOptions.type === TransportType.Streamable) {
        console.log(this.server);
        
        await startStreamableMcpServer(this.server, transportOptions.endpoint || '/mcp', transportOptions.port || 3322);
        // Streamable 传输需要 HTTP 服务器支持，这里提供配置信息
        this.logger.info(`Streamable transport configured for ${transportOptions.host}:${transportOptions.port}`);
        this.isRunning = true;
        this.logger.info(`FastMCP server "${this.options.name}" started with ${transportOptions.type} transport`);
        
        // 设置优雅关闭
        process.on('SIGINT', () => this.gracefulShutdown());
        process.on('SIGTERM', () => this.gracefulShutdown());
        return;
      }
      
      if (transportOptions.type === TransportType.SSE) {
        // SSE transport is no longer recommended by MCP official
        this.logger.warn(`SSE transport configured for ${transportOptions.host}:${transportOptions.port}`);
        this.logger.warn('⚠️  DEPRECATION NOTICE: MCP officially no longer encourages using SSE connections.');
        this.logger.info('💡 RECOMMENDED: Please consider using streamable transport instead for better performance and compatibility.');
        this.logger.info('📖 For migration guidance, please refer to the streamable transport documentation.');
        throw new Error('SSE transport is deprecated. MCP officially recommends using streamable transport instead. Please refer to the streamable transport documentation for migration guidance.');
      } else {
        // 使用 stdio 传输
        this.transport = TransportFactory.create(transportOptions) as StdioServerTransport;
      }
      
      await this.server.connect(this.transport);
      this.isRunning = true;
      this.logger.info(`FastMCP server "${this.options.name}" started with ${transportOptions.type} transport`);

      // 设置优雅关闭
      process.on('SIGINT', () => this.gracefulShutdown());
      process.on('SIGTERM', () => this.gracefulShutdown());
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      this.isRunning = false;
      throw error;
    }
  }

  private async gracefulShutdown(): Promise<void> {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.shutdownPromise = this.performShutdown();
    return this.shutdownPromise;
  }

  private async performShutdown(): Promise<void> { 
    this.logger.info('Shutting down server...');
    this.isRunning = false;
    
    // 等待当前请求完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      // 关闭服务器
      await this.server.close();
      this.logger.info('Server shutdown complete');
    } catch (error) {
      this.logger.error('Error during server shutdown:', error);
      throw error;
    }
  }

  /**
   * 健康检查 - 检查服务器运行状态和连接状态
   */
  isHealthy(): boolean {
    return this.isRunning && this.server !== null;
  }

  async stop(): Promise<void> {
    return this.gracefulShutdown();
  }
}