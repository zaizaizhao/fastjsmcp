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
        // This will be handled by the HTTP server setup
        return {
          type: 'sse',
          port: options.port,
          host: options.host || 'localhost'
        };
      default:
        throw new Error(`Unsupported transport type: ${(options as any).type}`);
    }
  }

  /**
   * Create SSE transport with HTTP server setup
   * This method should be called when setting up an HTTP server for SSE transport
   */
  static createSSETransport(endpoint: string, response: any): SSEServerTransport {
    return new SSEServerTransport(endpoint, response);
  }
}

// Re-export transport classes for convenience
export { StdioServerTransport, SSEServerTransport };