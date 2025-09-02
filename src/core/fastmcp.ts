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
import winston from 'winston';
import type {
  FastMCPOptions,
  ServerRegistry,
  ToolMetadata,
  ResourceMetadata,
  PromptMetadata,
  ToolHandler,
  ResourceHandler,
  PromptHandler,
  ToolSchema,
  ExecutionContext,
  Transport,
  ToolDecorator,
  ResourceDecorator,
  PromptDecorator,
} from '../types/index.js';
import {
  getToolsMetadata,
  getResourcesMetadata,
  getPromptsMetadata,
} from '../decorators/index.js';

export class FastMCP {
  private server: Server;
  private registry: ServerRegistry;
  private logger: winston.Logger;
  private options: FastMCPOptions;
  private transport?: Transport;

  constructor(options: FastMCPOptions) {
    this.options = options;
    this.registry = {
      tools: new Map(),
      resources: new Map(),
      prompts: new Map(),
    };

    // Initialize logger
    this.logger = winston.createLogger({
      level: options.logging?.level || 'info',
      format: options.logging?.format === 'json' 
        ? winston.format.json()
        : winston.format.simple(),
      transports: [
        new winston.transports.Console(),
      ],
    });

    // Initialize MCP server
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

    this.setupHandlers();
  }

  /**
   * Register a class instance with decorated methods
   */
  register(instance: any): void {
    const constructor = instance.constructor;

    // Register tools
    const tools = getToolsMetadata(constructor);
    for (const toolMeta of tools) {
      this.registerTool(
        toolMeta.name,
        toolMeta.handler.bind(instance),
        toolMeta.schema
      );
    }

    // Register resources
    const resources = getResourcesMetadata(constructor);
    for (const resourceMeta of resources) {
      this.registerResource(
        resourceMeta.uri,
        resourceMeta.handler.bind(instance),
        {
          name: resourceMeta.name,
          description: resourceMeta.description,
          mimeType: resourceMeta.mimeType,
        }
      );
    }

    // Register prompts
    const prompts = getPromptsMetadata(constructor);
    for (const promptMeta of prompts) {
      this.registerPrompt(
        promptMeta.name,
        promptMeta.handler.bind(instance),
        {
          description: promptMeta.description,
          arguments: promptMeta.arguments,
        }
      );
    }
  }

 /**
 * Instance decorator for tools - allows @mcp.tool usage on class methods
 * and higher-order function usage on standalone functions
 */
  tool: ToolDecorator = (options?) => {
    return (target: Function, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
      // Handle function decoration
      if (typeof target === 'function' && !propertyKey) {
        const toolName = options?.name || target.name || `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const toolSchema = {
          description: options?.description || `Tool: ${toolName}`,
          inputSchema: options?.inputSchema || { type: 'object', properties: {}, additionalProperties: true },
        };
        
        this.registerTool(toolName, target as ToolHandler, toolSchema);
        return target;
      }
      
      // Handle method decoration (existing behavior)
      if (descriptor && typeof descriptor.value === 'function') {
        const toolName = options?.name || String(propertyKey);
        const toolSchema = {
          description: options?.description || `Tool: ${toolName}`,
          inputSchema: options?.inputSchema || { type: 'object', properties: {}, additionalProperties: true },
        };
        
        // Store metadata for later registration via register() method
         const constructor = target.constructor as any;
         if (!constructor[Symbol.for('fastmcp:tools')]) {
           constructor[Symbol.for('fastmcp:tools')] = [];
         }
         constructor[Symbol.for('fastmcp:tools')].push({
          name: toolName,
          handler: descriptor.value,
          schema: toolSchema,
        });
        
        return descriptor;
      }
      
      throw new Error('Invalid decorator usage');
    };
  };

  /**
   * Instance decorator for resources - allows @mcp.resource usage on functions
   */
  resource: ResourceDecorator = (options?) => {
    return (target: Function, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
      // Handle function decoration
      if (typeof target === 'function' && !propertyKey) {
        const resourceUri = options?.uri || target.name || `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        this.registerResource(resourceUri, target as ResourceHandler, {
          name: options?.name,
          description: options?.description,
          mimeType: options?.mimeType,
        });
        return target;
      }
      
      // Handle method decoration (existing behavior)
      if (descriptor && typeof descriptor.value === 'function') {
        const resourceUri = options?.uri || String(propertyKey);
        
        // Store metadata for later registration via register() method
         const constructor = target.constructor as any;
         if (!constructor[Symbol.for('fastmcp:resources')]) {
           constructor[Symbol.for('fastmcp:resources')] = [];
         }
         constructor[Symbol.for('fastmcp:resources')].push({
          uri: resourceUri,
          name: options?.name,
          description: options?.description,
          mimeType: options?.mimeType,
          handler: descriptor.value,
        });
        
        return descriptor;
      }
      
      throw new Error('Invalid decorator usage');
    };
  };

  /**
   * Instance decorator for prompts - allows @mcp.prompt usage on functions
   */
  prompt: PromptDecorator = (options?) => {
    return (target: Function, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
      // Handle function decoration
      if (typeof target === 'function' && !propertyKey) {
        const promptName = options?.name || target.name || `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        this.registerPrompt(promptName, target as PromptHandler, {
          description: options?.description,
          arguments: options?.arguments,
        });
        return target;
      }
      
      // Handle method decoration (existing behavior)
      if (descriptor && typeof descriptor.value === 'function') {
        const promptName = options?.name || String(propertyKey);
        
        // Store metadata for later registration via register() method
         const constructor = target.constructor as any;
         if (!constructor[Symbol.for('fastmcp:prompts')]) {
           constructor[Symbol.for('fastmcp:prompts')] = [];
         }
         constructor[Symbol.for('fastmcp:prompts')].push({
          name: promptName,
          description: options?.description,
          arguments: options?.arguments,
          handler: descriptor.value,
        });
        
        return descriptor;
      }
      
      throw new Error('Invalid decorator usage');
    };
  };

  /**
   * Register a tool programmatically
   */
  registerTool(name: string, handler: ToolHandler, schema: ToolSchema): void {
    if (!name || typeof name !== 'string') {
      throw new Error('Tool name must be a non-empty string');
    }
    if (!handler || typeof handler !== 'function') {
      throw new Error('Tool handler must be a function');
    }
    if (!schema) {
      throw new Error('Tool schema is required');
    }
    
    this.registry.tools.set(name, {
      name,
      schema,
      handler,
    });
    this.logger.info(`Registered tool: ${name}`);
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
    this.registry.resources.set(uri, {
      uri,
      name: options?.name,
      description: options?.description,
      mimeType: options?.mimeType,
      handler,
    });
    this.logger.info(`Registered resource: ${uri}`);
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
    this.registry.prompts.set(name, {
      name,
      description: options?.description,
      arguments: options?.arguments,
      handler,
    });
    this.logger.info(`Registered prompt: ${name}`);
  }

  /**
   * Setup MCP protocol handlers
   */
  private setupHandlers(): void {
    // Tools handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Array.from(this.registry.tools.values()).map(tool => ({
        name: tool.name,
        description: tool.schema.description,
        inputSchema: this.zodToJsonSchema(tool.schema.inputSchema),
      }));
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const toolMeta = this.registry.tools.get(name);
      
      if (!toolMeta) {
        throw new Error(`Tool not found: ${name}`);
      }

      try {
        // Validate input
        const validatedArgs = toolMeta.schema.inputSchema.parse(args);
        
        // Create execution context
        const context: ExecutionContext = {
          requestId: crypto.randomUUID(),
          timestamp: new Date(),
          cancel: new AbortController().signal,
        };

        // Execute tool
        const result = await toolMeta.handler(validatedArgs, context);
        
        return {
          content: result.content,
          isError: result.isError || false,
        };
      } catch (error) {
        this.logger.error(`Tool execution error: ${name}`, error);
        return {
          content: [{
            type: 'text' as const,
            text: `Error executing tool: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    });

    // Resources handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = Array.from(this.registry.resources.values()).map(resource => ({
        uri: resource.uri,
        name: resource.name || resource.uri,
        description: resource.description,
        mimeType: resource.mimeType,
      }));
      return { resources };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      const resourceMeta = this.registry.resources.get(uri);
      
      if (!resourceMeta) {
        throw new Error(`Resource not found: ${uri}`);
      }

      try {
        const result = await resourceMeta.handler(uri);
        return {
          contents: result.contents,
        };
      } catch (error) {
        this.logger.error(`Resource read error: ${uri}`, error);
        throw error;
      }
    });

    // Prompts handlers
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const prompts = Array.from(this.registry.prompts.values()).map(prompt => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments ? this.zodToJsonSchema(prompt.arguments) : undefined,
      }));
      return { prompts };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const promptMeta = this.registry.prompts.get(name);
      
      if (!promptMeta) {
        throw new Error(`Prompt not found: ${name}`);
      }

      try {
        // Validate arguments if schema is provided
        const validatedArgs = promptMeta.arguments 
          ? promptMeta.arguments.parse(args || {})
          : args;
        
        const result = await promptMeta.handler(validatedArgs as any);
        return {
          description: result.description,
          messages: result.messages,
        };
      } catch (error) {
        this.logger.error(`Prompt execution error: ${name}`, error);
        throw error;
      }
    });
  }

  /**
   * Convert Zod schema to JSON Schema (simplified)
   */
  private zodToJsonSchema(schema: any): any {
    // This is a simplified conversion
    // In a real implementation, you might want to use a library like zod-to-json-schema
    return {
      type: 'object',
      properties: {},
      additionalProperties: true,
    };
  }

  /**
   * Run the server
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport() as any;
    await this.server.connect(transport);
    this.logger.info(`FastMCP server '${this.options.name}' started`);
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    await this.server.close();
    this.logger.info(`FastMCP server '${this.options.name}' stopped`);
  }
}