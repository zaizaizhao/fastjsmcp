import 'reflect-metadata';
import type { FastMcpDecoratorOptions } from '../types/index.js';

/**
 * FastMCP class decorator for automatic server setup and registration
 */
export function fastMcp(options: FastMcpDecoratorOptions): <T extends new (...args: any[]) => any>(constructor: T) => T {
  return function <T extends new (...args: any[]) => any>(constructor: T): T {
    // Store decorator options as metadata for CLI detection
    Reflect.defineMetadata('fastmcp:options', options, constructor);

    const isAutoStartEnabled = (): boolean => {
      const flag = process.env.FASTMCP_AUTOSTART;
      if (flag === undefined) {
        return true;
      }

      const normalized = flag.trim().toLowerCase();
      return !['false', '0', 'no', 'off'].includes(normalized);
    };
    
    // Create a new class that extends the original
    class FastMcpServer extends constructor {
      constructor(...args: any[]) {
        super(...args);
        
        // Always set up the server when the class is instantiated
        // Use setTimeout to ensure this runs after constructor completion
        const autoStart = isAutoStartEnabled();
        setTimeout(async () => {
          if (!autoStart) {
            return;
          }

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

    try {
      if (!isAutoStartEnabled()) {
        return FastMcpServer as T;
      }

      const argv = process.argv || [];
      const mainModule = process.argv?.[1];
      
      // CLI detection - only detect actual fastmcp CLI usage
      const isCliMode = argv.some((arg) =>
        arg.includes('cli.js') ||
        arg.includes('dist/src/cli.js')
      ) || (mainModule && (
        mainModule.includes('cli.js') ||
        mainModule.includes('dist/src/cli.js')
      ));

      // Check if we're running from within node_modules (as a dependency)
      const isRunningFromNodeModules = Boolean(
        mainModule && mainModule.includes('node_modules')
      );

      // Check if the target file is index.ts from fastjsmcp package itself (should not auto-start)
      // Only block if it's actually the fastjsmcp package's own index.ts file
      const isFastjsmcpPackageIndexFile = Boolean(
        mainModule && 
        mainModule.includes('index.ts') && 
        (mainModule.includes('node_modules/fastjsmcp') || 
         (mainModule.includes('fastjsmcp') && mainModule.includes('src/index.ts')))
      );

      // Direct execution detection - allow user project files to auto-start
      const isDirectExecution = Boolean(
        mainModule &&
        (mainModule.endsWith('.ts') || mainModule.endsWith('.js')) &&
        !isRunningFromNodeModules
      );

      // Only auto-start if:
      // 1. Not in CLI mode (not run through fastmcp CLI)
      // 2. Direct execution (user running their own file)
      // 3. Not the fastjsmcp package's own index.ts file
      if (!isCliMode && isDirectExecution && !isFastjsmcpPackageIndexFile) {
        setTimeout(() => {
          // Automatically instantiate when the module is executed directly (e.g., via tsx)
          new FastMcpServer();
        }, 0);
      }
    } catch (error) {
      console.warn('FastMCP auto-start detection failed:', error);
    }
    
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
      arg.includes('fastjsmcp') ||
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