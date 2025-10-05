import { z } from 'zod';
import type {
  Tool,
  Resource,
  Prompt,
  ServerCapabilities,
  ClientCapabilities,
  JSONRPCMessage,
  CallToolResult,
  ReadResourceResult,
  GetPromptResult,
} from '@modelcontextprotocol/sdk/types.js';

// Re-export MCP types
export type {
  Tool,
  Resource,
  Prompt,
  ServerCapabilities,
  ClientCapabilities,
  JSONRPCMessage,
  CallToolResult,
  ReadResourceResult,
  GetPromptResult,
};

// FastMCP specific types
export interface FastMCPOptions {
  name: string;
  version: string;
  capabilities?: Partial<ServerCapabilities>;
  transport?: TransportOptions;
  logging?: LoggingOptions;
}

export interface TransportOptions {
  type: 'stdio' | 'sse';
  port?: number;
  host?: string;
}

export interface LoggingOptions {
  level?: 'error' | 'warn' | 'info' | 'debug';
  format?: 'json' | 'simple';
  transports?: string[];
}

// Tool related types
export interface ToolSchema {
  description: string;
  inputSchema: z.ZodSchema;
  outputSchema?: z.ZodSchema;
  examples?: ToolExample[];
}

export interface ToolExample {
  name: string;
  description?: string;
  input: any;
  output: any;
}

export interface ToolHandler {
  (params: any, context?: ExecutionContext): Promise<ToolResult>;
}

export interface ToolResult {
  content: ContentBlock[];
  isError?: boolean;
  metadata?: Record<string, any>;
}

export interface ContentBlock {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
}

// Resource related types
export interface ResourceHandler {
  (uri: string, params?: Record<string, any>): Promise<ResourceContent>;
}

export interface ResourceContent {
  contents: ResourceContentBlock[];
  metadata?: Record<string, any>;
}

export interface ResourceContentBlock {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: Uint8Array;
}

// Prompt related types
export interface PromptHandler {
  (params?: Record<string, any>): Promise<PromptResult>;
}

export interface PromptResult {
  description?: string;
  messages: PromptMessage[];
}

export interface PromptMessage {
  role: 'user' | 'assistant' | 'system';
  content: ContentBlock[];
}

// Execution context
export interface ExecutionContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  cancel: AbortSignal;
}

// Decorator metadata
export interface ToolMetadata {
  name: string;
  description?: string;
  schema: ToolSchema;
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
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
  handler: PromptHandler;
}

// Server registry
export interface ServerRegistry {
  tools: Map<string, ToolMetadata>;
  resources: Map<string, ResourceMetadata>;
  prompts: Map<string, PromptMetadata>;
}

// Transport interface
export interface Transport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: JSONRPCMessage): Promise<void>;
  onMessage(handler: (message: JSONRPCMessage) => void): void;
  onError(handler: (error: Error) => void): void;
  onClose(handler: () => void): void;
}

// Decorator function types
export interface ToolDecoratorOptions {
  name?: string;
  description?: string;
  inputSchema?: any;
}

export interface ResourceDecoratorOptions {
  uri?: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

export interface PromptDecoratorOptions {
  name?: string;
  description?: string;
  arguments?: any;
}

// Decorator function signatures
export type ToolDecorator = (options?: ToolDecoratorOptions) => (
  target: Function | any,
  propertyKey?: string | symbol,
  descriptor?: PropertyDescriptor
) => any;

export type ResourceDecorator = (options?: ResourceDecoratorOptions) => (
  target: Function | any,
  propertyKey?: string | symbol,
  descriptor?: PropertyDescriptor
) => any;

export type PromptDecorator = (options?: PromptDecoratorOptions) => (
  target: Function | any,
  propertyKey?: string | symbol,
  descriptor?: PropertyDescriptor
) => any;