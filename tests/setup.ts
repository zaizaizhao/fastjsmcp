// Jest setup file
require('reflect-metadata');

// Global test configuration
jest.setTimeout(10000);

// Disable automatic FastMCP server bootstrapping during tests
process.env.FASTMCP_AUTOSTART = 'false';

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

// Global test utilities
global.testUtils = {
  // Helper to wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to create mock functions with proper typing
  createMockFn: <T extends (...args: any[]) => any>(implementation?: T) => {
    return jest.fn(implementation) as any;
  },
};

// Extend Jest matchers if needed
declare global {
  namespace jest {
    interface Matchers<R> {
      // Add custom matchers here if needed
    }
  }
  
  var testUtils: {
    wait: (ms: number) => Promise<void>;
    createMockFn: <T extends (...args: any[]) => any>(implementation?: T) => jest.MockedFunction<T>;
  };
}