import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { TransportOptions } from '../types/index.js';

/**
 * Factory for creating transport instances
 */
export class TransportFactory {
  static create(options: TransportOptions) {
    switch (options.type) {
      case 'stdio':
        return new StdioServerTransport();
      case 'sse':
        if (!options.port) {
          throw new Error('Port is required for SSE transport');
        }
        // SSE transport requires endpoint and response object
        // This is a placeholder implementation
        throw new Error('SSE transport requires additional setup with HTTP server');
      default:
        throw new Error(`Unsupported transport type: ${(options as any).type}`);
    }
  }
}

// Re-export transport classes for convenience
export { StdioServerTransport, SSEServerTransport };