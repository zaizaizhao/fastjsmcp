import 'reflect-metadata';
import { z } from 'zod';
import type {
  ToolSchema,
  ToolHandler,
  ResourceHandler,
  PromptHandler,
  ToolMetadata,
  ResourceMetadata,
  PromptMetadata,
  ToolDecoratorOptions,
  ResourceDecoratorOptions,
  PromptDecoratorOptions,
  FastMcpDecoratorOptions,
} from '../types/index.js';


// Metadata keys
export const TOOLS_METADATA_KEY = Symbol('fastmcp:tools');
export const RESOURCES_METADATA_KEY = Symbol('fastmcp:resources');
export const PROMPTS_METADATA_KEY = Symbol('fastmcp:prompts');

// Global registry for function decorators
let globalFastMCPInstance: any = null;

/**
 * Set the global FastMCP instance for function decorators
 */
export function setGlobalFastMCPInstance(instance: any) {
  globalFastMCPInstance = instance;
}

/**
 * Enhanced tool decorator that supports both method and function decoration
 */
export function tool(config: ToolDecoratorOptions): any {
  return function (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) {
    // Handle function decoration (when used as mcp.tool()(fn))
    if (typeof target === 'function' && !propertyKey && !descriptor) {
      const toolName = config.name || target.name || `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const toolSchema: ToolSchema = {
        description: config.description || `Tool: ${toolName}`,
        ...(config.inputSchema && { inputSchema: config.inputSchema }),
      };
      
      // If global instance is available, register immediately
      if (globalFastMCPInstance) {
        globalFastMCPInstance.registerTool(toolName, target as ToolHandler, toolSchema);
      }
      
      return target;
    }
    
    // Handle method decoration (when used as @tool)
    if (descriptor && typeof descriptor.value === 'function') {
      const existingTools = Reflect.getMetadata(TOOLS_METADATA_KEY, target.constructor) || [];
      
      const toolMetadata: ToolMetadata = {
        name: config.name || String(propertyKey),
        description: config.description,
        schema: {
          description: config.description || '',
          ...(config.inputSchema && { inputSchema: config.inputSchema }),
        },
        handler: descriptor.value,
      };
      
      existingTools.push(toolMetadata);
      Reflect.defineMetadata(TOOLS_METADATA_KEY, existingTools, target.constructor);
      
      return descriptor;
    }
    
    throw new Error('Invalid tool decorator usage');
  };
}

/**
 * Enhanced resource decorator that supports both method and function decoration
 */
export function resource(config: ResourceDecoratorOptions): any {
  return function (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) {
    // Handle function decoration (when used as mcp.resource()(fn))
    if (typeof target === 'function' && !propertyKey && !descriptor) {
      const resourceUri = config.uri || target.name || `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // If global instance is available, register immediately
      if (globalFastMCPInstance) {
        globalFastMCPInstance.registerResource(resourceUri, target as ResourceHandler, {
          name: config.name,
          description: config.description,
          mimeType: config.mimeType,
        });
      }
      
      return target;
    }
    
    // Handle method decoration (when used as @resource)
    if (descriptor && typeof descriptor.value === 'function') {
      const existingResources = Reflect.getMetadata(RESOURCES_METADATA_KEY, target.constructor) || [];
      
      const resourceMetadata: ResourceMetadata = {
        uri: config.uri || String(propertyKey),
        name: config.name,
        description: config.description,
        mimeType: config.mimeType,
        handler: descriptor.value,
      };
      
      existingResources.push(resourceMetadata);
      Reflect.defineMetadata(RESOURCES_METADATA_KEY, existingResources, target.constructor);
      
      return descriptor;
    }
    
    throw new Error('Invalid resource decorator usage');
  };
}

/**
 * Enhanced prompt decorator that supports both method and function decoration
 */
export function prompt(config: PromptDecoratorOptions): any {
  return function (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) {
    // Handle function decoration (when used as mcp.prompt()(fn))
    if (typeof target === 'function' && !propertyKey && !descriptor) {
      const promptName = config.name || target.name || `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // If global instance is available, register immediately
      if (globalFastMCPInstance) {
        globalFastMCPInstance.registerPrompt(promptName, target as PromptHandler, {
          description: config.description,
          arguments: config.arguments,
        });
      }
      
      return target;
    }
    
    // Handle method decoration (when used as @prompt)
    if (descriptor && typeof descriptor.value === 'function') {
      const existingPrompts = Reflect.getMetadata(PROMPTS_METADATA_KEY, target.constructor) || [];
      
      const promptMetadata: PromptMetadata = {
        name: config.name || String(propertyKey),
        description: config.description,
        arguments: config.arguments,
        handler: descriptor.value,
      };
      
      existingPrompts.push(promptMetadata);
      Reflect.defineMetadata(PROMPTS_METADATA_KEY, existingPrompts, target.constructor);
      
      return descriptor;
    }
    
    throw new Error('Invalid prompt decorator usage');
  };
}

/**
 * Get tools metadata from a class
 */
export function getToolsMetadata(target: any): ToolMetadata[] {
  return Reflect.getMetadata(TOOLS_METADATA_KEY, target) || [];
}

/**
 * Get resources metadata from a class
 */
export function getResourcesMetadata(target: any): ResourceMetadata[] {
  return Reflect.getMetadata(RESOURCES_METADATA_KEY, target) || [];
}

/**
 * Get prompts metadata from a class
 */
export function getPromptsMetadata(target: any): PromptMetadata[] {
  return Reflect.getMetadata(PROMPTS_METADATA_KEY, target) || [];
}

// Import and re-export the fastMcp decorator from the dedicated file
export { fastMcp, checkIfDirectRun } from './fastmcpDecorator.js';

// Helper function to create Zod schemas
export const Schema = {
  string: () => z.string(),
  number: () => z.number(),
  boolean: () => z.boolean(),
  array: <T>(schema: z.ZodType<T>) => z.array(schema),
  object: <T extends z.ZodRawShape>(shape: T) => z.object(shape),
  optional: <T>(schema: z.ZodType<T>) => z.optional(schema),
  nullable: <T>(schema: z.ZodType<T>) => z.nullable(schema),
  union: <T extends readonly [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]>(schemas: T) => z.union(schemas),
  enum: <T extends readonly [string, ...string[]]>(values: T) => z.enum(values),
};