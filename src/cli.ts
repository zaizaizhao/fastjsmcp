#!/usr/bin/env node

import { program } from 'commander';
import { FastMCP } from './core/fastmcp.js';
import { CalculatorServer } from './examples/calculator.js';
import { FileSystemServer } from './examples/filesystem.js';
import { PromptServer } from './examples/prompts.js';
import { ComprehensiveServer } from './examples/comprehensive.js';
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
const VERSION = '1.0.0';

// Available server examples
const SERVERS = {
  calculator: CalculatorServer,
  filesystem: FileSystemServer,
  prompts: PromptServer,
  comprehensive: ComprehensiveServer,
};

// Extract run server logic into a reusable function
async function runServer(file: string | undefined, options: any) {
    try {
      let ServerClass: any;
      let serverType: string;
      let serverName: string;

      // Check if a file path is provided
      if (file) {
        // Handle file path argument
        const filePath = path.resolve(file);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
          console.error(`Error: File not found: ${filePath}`);
          process.exit(1);
        }

        // Check file extension
        const ext = path.extname(filePath);
        if (!['.js', '.ts', '.mjs', '.cjs'].includes(ext)) {
          console.error(`Error: Unsupported file extension: ${ext}`);
          console.error('Supported extensions: .js, .ts, .mjs, .cjs');
          process.exit(1);
        }

        try {
          // Dynamic import for ES modules and TypeScript files
          const fileUrl = pathToFileURL(filePath).href;
          const module = await import(fileUrl);
          
          // Try to find a server class in the module
          ServerClass = module.default || 
                       module.Server || 
                       module[path.basename(filePath, ext)] ||
                       Object.values(module).find((exp: any) => 
                         typeof exp === 'function' && 
                         exp.prototype && 
                         (exp.name.includes('Server') || exp.name.includes('MCP'))
                       );

          if (!ServerClass) {
            console.error(`Error: No server class found in ${filePath}`);
            console.error('Expected exports: default export, Server, or a class with "Server" or "MCP" in the name');
            process.exit(1);
          }

          serverType = path.basename(filePath, ext);
          serverName = options.name || `${serverType}-server`;
          
          console.log(`Loading server from: ${filePath}`);
          console.log(`Server class: ${ServerClass.name}`);
          
          // Check if the class has @fastMcp decorator
          // If it does, just instantiate it and let the decorator handle the server setup
          const hasFastMcpDecorator = Reflect.hasMetadata && Reflect.hasMetadata('fastmcp:options', ServerClass);
          if (hasFastMcpDecorator) {
            console.log(`Detected @fastMcp decorator, auto-starting server...`);
            new ServerClass();
            return; // Exit early, let the decorator handle everything
          }
          
        } catch (error) {
          console.error(`Error loading server file: ${error}`);
          if (ext === '.ts') {
            console.error('Note: For TypeScript files, make sure they are compiled or use tsx/ts-node');
          }
          process.exit(1);
        }
      } else {
        // Use built-in server types
        ServerClass = SERVERS[options.server as keyof typeof SERVERS];
        if (!ServerClass) {
          console.error(`Unknown server type: ${options.server}`);
          console.error(`Available servers: ${Object.keys(SERVERS).join(', ')}`);
          process.exit(1);
        }
        serverType = options.server;
        serverName = options.name || `${options.server}-server`;
      }
      
      const fastmcp = new FastMCP({
        name: serverName,
        version: options.serverVersion,
        logging: {
          level: options.logLevel,
          format: options.logFormat,
        },
        transport: {
          type: options.transport,
          port: options.transport !== 'stdio' ? parseInt(options.port) : undefined,
          host: options.transport !== 'stdio' ? options.host : undefined,
        },
      });

      // Create server instance with options
      let serverInstance;
      if (serverType === 'filesystem' || (file && serverType.includes('filesystem'))) {
        serverInstance = new ServerClass(options.basePath);
      } else {
        serverInstance = new ServerClass();
      }

      fastmcp.register(serverInstance);
      
      console.log(`Starting ${serverName} (${serverType}) on ${options.transport}...`);
      await fastmcp.run();
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\nShutting down server...');
        await fastmcp.stop();
        process.exit(0);
      });
      
      process.on('SIGTERM', async () => {
        console.log('\nShutting down server...');
        await fastmcp.stop();
        process.exit(0);
      });
      
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
}

program
  .name('fastmcp')
  .description('FastMCP - A fast and easy-to-use Model Context Protocol server')
  .version(VERSION)
  .argument('[file]', 'Server file path (e.g., ./calculator.js or ./calculator.ts)')
  .option('-s, --server <type>', 'Server type to run (when not using file path)', 'calculator')
  .option('-n, --name <name>', 'Server name')
  .option('--server-version <version>', 'Server version', '1.0.0')
  .option('-t, --transport <type>', 'Transport type', 'stdio')
  .option('-p, --port <port>', 'Port for HTTP/WebSocket transport', '3000')
  .option('-h, --host <host>', 'Host for HTTP/WebSocket transport', 'localhost')
  .option('-l, --log-level <level>', 'Log level', 'info')
  .option('--log-format <format>', 'Log format (simple|json)', 'simple')
  .option('--base-path <path>', 'Base path for filesystem server', process.cwd())
  .action(async (file, options) => {
    await runServer(file, options);
  });

program
  .command('run')
  .description('Run a FastMCP server')
  .argument('[file]', 'Server file path (e.g., ./calculator.js or ./calculator.ts)')
  .option('-s, --server <type>', 'Server type to run (when not using file path)', 'calculator')
  .option('-n, --name <name>', 'Server name')
  .option('--server-version <version>', 'Server version', '1.0.0')
  .option('-t, --transport <type>', 'Transport type', 'stdio')
  .option('-p, --port <port>', 'Port for HTTP/WebSocket transport', '3000')
  .option('-h, --host <host>', 'Host for HTTP/WebSocket transport', 'localhost')
  .option('-l, --log-level <level>', 'Log level', 'info')
  .option('--log-format <format>', 'Log format (simple|json)', 'simple')
  .option('--base-path <path>', 'Base path for filesystem server', process.cwd())
  .action(async (file, options) => {
    await runServer(file, options);
  });

program
  .command('list')
  .description('List available server examples')
  .action(() => {
    console.log('Available FastMCP server examples:');
    console.log('');
    
    Object.keys(SERVERS).forEach(name => {
      console.log(`  ${name.padEnd(15)} - ${getServerDescription(name)}`);
    });
    
    console.log('');
    console.log('Usage: fastmcp --server <type> or fastmcp run --server <type>');
  });

program
  .command('init')
  .description('Initialize a new FastMCP server project')
  .argument('<name>', 'Project name')
  .option('-t, --template <template>', 'Template to use', 'basic')
  .action(async (name, options) => {
    console.log(`Initializing FastMCP project: ${name}`);
    console.log(`Template: ${options.template}`);
    
    // This would create a new project structure
    // For now, just show what would be created
    console.log('');
    console.log('Project structure that would be created:');
    console.log(`${name}/`);
    console.log('├── package.json');
    console.log('├── tsconfig.json');
    console.log('├── src/');
    console.log('│   ├── index.ts');
    console.log('│   └── server.ts');
    console.log('└── README.md');
    console.log('');
    console.log('Note: Project initialization is not yet implemented.');
  });

function getServerDescription(serverType: string): string {
  const descriptions = {
    calculator: 'Basic arithmetic operations',
    filesystem: 'File system operations and resources',
    prompts: 'AI prompt generation examples',
    comprehensive: 'All features demonstration',
  };
  
  return descriptions[serverType as keyof typeof descriptions] || 'Unknown server';
}

// Parse command line arguments
program.parse();