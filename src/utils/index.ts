import { z } from 'zod';

/**
 * Utility functions for FastMCP
 */

/**
 * Convert Zod schema to JSON Schema (simplified version)
 */
export function zodToJsonSchema(schema: z.ZodType): any {
  // This is a simplified implementation
  // In a real implementation, you might want to use a library like zod-to-json-schema
  
  const schemaType = (schema as any)._def?.typeName;
  
  switch (schemaType) {
    case 'ZodString':
      return { type: 'string' };
    case 'ZodNumber':
      return { type: 'number' };
    case 'ZodBoolean':
      return { type: 'boolean' };
    case 'ZodArray':
      return {
        type: 'array',
        items: zodToJsonSchema((schema as any)._def.type)
      };
    case 'ZodObject':
      const properties: Record<string, any> = {};
      const required: string[] = [];
      
      for (const [key, value] of Object.entries((schema as any)._def.shape())) {
        properties[key] = zodToJsonSchema(value as z.ZodType);
        if ((value as any)._def?.typeName !== 'ZodOptional') {
          required.push(key);
        }
      }
      
      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined
      };
    default:
      // Fallback for other types
      return { type: 'any' };
  }
}

/**
 * Validate and parse arguments using Zod schema
 */
export function validateArgs<T>(schema: z.ZodSchema<T>, args: unknown): T {
  try {
    return schema.parse(args);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');
      throw new Error(`Validation error: ${issues}`);
    }
    throw error;
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(message: string, code?: string): {
  content: Array<{ type: 'text'; text: string }>;
  isError: true;
} {
  return {
    content: [{
      type: 'text',
      text: code ? `[${code}] ${message}` : message,
    }],
    isError: true,
  };
}

/**
 * Create a success response with text content
 */
export function createTextResponse(text: string): {
  content: Array<{ type: 'text'; text: string }>;
  isError?: false;
} {
  return {
    content: [{
      type: 'text',
      text,
    }],
  };
}

/**
 * Create a success response with image content
 */
export function createImageResponse(data: string, mimeType: string): {
  content: Array<{ type: 'image'; data: string; mimeType: string }>;
  isError?: false;
} {
  return {
    content: [{
      type: 'image',
      data,
      mimeType,
    }],
  };
}

/**
 * Debounce function for rate limiting
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function for rate limiting
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Simple logger utility
 */
export class Logger {
  private prefix: string;
  
  constructor(prefix: string = 'FastMCP') {
    this.prefix = prefix;
  }
  
  info(message: string, ...args: any[]): void {
    console.log(`[${this.prefix}] INFO: ${message}`, ...args);
  }
  
  warn(message: string, ...args: any[]): void {
    console.warn(`[${this.prefix}] WARN: ${message}`, ...args);
  }
  
  error(message: string, ...args: any[]): void {
    console.error(`[${this.prefix}] ERROR: ${message}`, ...args);
  }
  
  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${this.prefix}] DEBUG: ${message}`, ...args);
    }
  }
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if a value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    value.constructor === Object
  );
}

/**
 * Deep merge two objects
 */
export function deepMerge<T extends Record<string, any>>(
  target: Partial<T>,
  source: Partial<T>
): T {
  const result = { ...target } as T;
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = target[key];
      
      if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        result[key] = deepMerge(targetValue as any, sourceValue as any);
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }
  
  return result;
}