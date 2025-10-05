import { z } from 'zod';
import { zodToJsonSchema as zodToJsonSchemaLib } from 'zod-to-json-schema';

/**
 * Utility functions for FastMCP
 */

/**

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
 * Name validation error class
 */
export class NameValidationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'NameValidationError';
  }
}

/**
 * Validate name according to FastMCP naming rules
 * 
 * Rules:
 * 1. 名称不能包含特殊字符 ￥?!$%~*?!><
 * 2. 中文名称(包括简体和繁体)中不得包含空格、换行符
 * 3. 仅为中文字符时，开始或结束不得含有。.
 * 4. 不能全为数字
 * 5. 支持中英文括号、支持输入-
 * 6. 不能全为相同字符
 */
export function validateName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new NameValidationError('名称不能为空', 'EMPTY_NAME');
  }

  // 规则1: 不能包含特殊字符 ￥?!$%~*?!><
  const forbiddenChars = /[￥?!$%~*><]/;
  if (forbiddenChars.test(name)) {
    throw new NameValidationError('名称不能包含特殊字符 ￥?!$%~*?!><', 'FORBIDDEN_CHARS');
  }

  // 规则3: 仅为中文字符时，开始或结束不得含有。. (需要在规则5之前检查)
  // 检查去掉句号后是否为纯中文
  const nameWithoutPeriods = name.replace(/[。.]/g, '');
  const isOnlyChineseWithoutPeriods = /^[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+$/.test(nameWithoutPeriods);
  if (isOnlyChineseWithoutPeriods && nameWithoutPeriods.length === name.length - (name.match(/[。.]/g) || []).length) {
    if (name.startsWith('。') || name.endsWith('。')) {
      throw new NameValidationError('纯中文名称开始或结束不得含有句号', 'CHINESE_WITH_PERIOD');
    }
  }

  // 规则2: 中文名称中不得包含空格、换行符
  const hasChinese = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(name);
  if (hasChinese && /[\s\n\r\t]/.test(name)) {
    throw new NameValidationError('中文名称中不得包含空格、换行符', 'CHINESE_WITH_WHITESPACE');
  }

  // 规则4: 不能全为数字 (长度大于1时)
  if (name.length > 1 && /^\d+$/.test(name)) {
    throw new NameValidationError('名称不能全为数字', 'ALL_DIGITS');
  }

  // 规则6: 不能全为相同字符 (需要在规则4之后检查，避免与全数字规则冲突)
  if (name.length > 1 && new Set(name).size === 1) {
    throw new NameValidationError('名称不能全为相同字符', 'ALL_SAME_CHARS');
  }

  // 规则5: 检查是否只包含允许的字符（中英文、数字、中英文括号、连字符、句号）
  const allowedChars = /^[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaffa-zA-Z0-9()（）\-_。.]+$/;
  if (!allowedChars.test(name)) {
    throw new NameValidationError('名称只能包含中英文字符、数字、括号、连字符和句号', 'INVALID_CHARS');
  }
}

/**
 * Create name validation regex (for reference)
 * This is a comprehensive regex that combines all the rules
 */
export function createNameValidationRegex(): RegExp {
  // 这个正则表达式组合了所有验证规则
  // 注意：复杂的逻辑验证（如全为相同字符）仍需要额外的函数检查
  return /^(?!\d+$)(?![。])(?!.*[￥?!$%~*><])(?!.*[\s\n\r\t].*[\u4e00-\u9fff])[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaffa-zA-Z0-9()（）\-_]+(?<![。])$/;
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