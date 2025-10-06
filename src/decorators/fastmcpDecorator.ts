import 'reflect-metadata';
import type { FastMcpDecoratorOptions } from '../types/index.js';

/**
 * FastMCP class decorator for automatic server setup and registration
 */
export function fastMcp(options: FastMcpDecoratorOptions): <T extends new (...args: any[]) => any>(constructor: T) => T {
  return function <T extends new (...args: any[]) => any>(constructor: T): T {
    // Store decorator options as metadata for CLI detection
    Reflect.defineMetadata('fastmcp:options', options, constructor);
    
    // Create a new class that extends the original
    class FastMcpServer extends constructor {
      constructor(...args: any[]) {
        super(...args);
        
        // Always set up the server when the class is instantiated
        // Use setTimeout to ensure this runs after constructor completion
        setTimeout(async () => {
          try {
            // Dynamically import FastMCP to avoid circular dependencies
            const { FastMCP } = await import('../core/fastmcp.js');
            const server = new FastMCP({
              name: options.name,
              version: options.version,
              serverVersion: options.serverVersion,
              transport: options.transport,
              logging: options.logging,
              capabilities: options.capabilities,
            });

            // Register this instance
            server.register(this);
            
            // Start the server
            await server.run();
            console.log(`FastMCP server "${options.name}" started successfully!`);
          } catch (error) {
            console.error('Failed to start FastMCP server:', error);
          }
        }, 0);
      }
    }

    // Preserve the original class name and prototype
    Object.defineProperty(FastMcpServer, 'name', { value: constructor.name });
    
    return FastMcpServer as T;
  };
}

/**
 * Helper function to detect if the module is being run directly via CLI
 */
export function checkIfDirectRun(): boolean {
  try {
    // Check if we're being run through the FastMCP CLI
    const argv = process.argv;
    const isCliMode = argv.some(arg => 
      arg.includes('cli.js') || 
      arg.includes('fastmcp') ||
      arg.includes('dist/src/cli.js')
    );
    
    // Also check if the main module path suggests direct execution
     const mainModule = process.argv[1];
     const isDirectExecution = Boolean(mainModule && (
       mainModule.endsWith('.ts') || 
       mainModule.endsWith('.js')
     ) && !mainModule.includes('node_modules'));
    
    return isCliMode || isDirectExecution;
  } catch (error) {
    return false;
  }
}