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
} from '../types/index.js';

// Metadata keys
const TOOLS_METADATA_KEY = Symbol('fastmcp:tools');
const RESOURCES_METADATA_KEY = Symbol('fastmcp:resources');
const PROMPTS_METADATA_KEY = Symbol('fastmcp:prompts');

/**
 * Tool decorator
 * @param name Tool name
 * @param schema Tool schema with input/output validation
 */
export function tool(config: { name: string; description?: string; inputSchema?: z.ZodType }): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    if (!target.constructor._tools) {
      target.constructor._tools = new Map();
    }
    
    target.constructor._tools.set(propertyKey, {
      name: config.name,
      description: config.description,
      inputSchema: config.inputSchema,
      handler: descriptor.value,
    });
  };
}

/**
 * Resource decorator for marking methods as MCP resources
 * @param config Resource configuration
 */
export function resource(config: { uri: string; name?: string; description?: string }): MethodDecorator {
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

/**
 * Prompt decorator for marking methods as MCP prompts
 * @param config Prompt configuration
 */
export function prompt(config: { name: string; description?: string; arguments?: Array<{ name: string; description?: string; required?: boolean }> }): MethodDecorator {
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

// Helper function to create Zod schemas
export const Schema = {
  string: () => z.string(),
  number: () => z.number(),
  boolean: () => z.boolean(),
  array: <T>(schema: z.ZodType<T>) => z.array(schema),
  object: <T extends z.ZodRawShape>(shape: T) => z.object(shape),
  optional: <T>(schema: z.ZodType<T>) => z.optional(schema),
  nullable: <T>(schema: z.ZodType<T>) => z.nullable(schema),
  union: <T extends readonly [z.ZodTypeAny, ...z.ZodTypeAny[]]>(schemas: T) => z.union(schemas),
  enum: <T extends readonly [string, ...string[]]>(values: T) => z.enum(values),
};