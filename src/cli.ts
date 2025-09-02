#!/usr/bin/env node

import { program } from 'commander';
import { FastMCP } from './core/fastmcp.js';
import { CalculatorServer } from './examples/calculator.js';
import { FileSystemServer } from './examples/filesystem.js';
import { PromptServer } from './examples/prompts.js';
import { ComprehensiveServer } from './examples/comprehensive.js';
const VERSION = '1.0.0';

// Available server examples
const SERVERS = {
  calculator: CalculatorServer,
  filesystem: FileSystemServer,
  prompts: PromptServer,
  comprehensive: ComprehensiveServer,
};

program
  .name('fastmcp')
  .description('FastMCP - A fast and easy-to-use Model Context Protocol server')
  .version(VERSION);

program
  .command('run')
  .description('Run a FastMCP server')
  .option('-s, --server <type>', 'Server type to run', 'calculator')
  .option('-n, --name <name>', 'Server name')
  .option('-v, --version <version>', 'Server version', '1.0.0')
  .option('-t, --transport <type>', 'Transport type', 'stdio')
  .option('-p, --port <port>', 'Port for HTTP/WebSocket transport', '3000')
  .option('-h, --host <host>', 'Host for HTTP/WebSocket transport', 'localhost')
  .option('-l, --log-level <level>', 'Log level', 'info')
  .option('--log-format <format>', 'Log format (simple|json)', 'simple')
  .option('--base-path <path>', 'Base path for filesystem server', process.cwd())
  .action(async (options) => {
    try {
      const ServerClass = SERVERS[options.server as keyof typeof SERVERS];
      if (!ServerClass) {
        console.error(`Unknown server type: ${options.server}`);
        console.error(`Available servers: ${Object.keys(SERVERS).join(', ')}`);
        process.exit(1);
      }

      const serverName = options.name || `${options.server}-server`;
      
      const fastmcp = new FastMCP({
        name: serverName,
        version: options.version,
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
      if (options.server === 'filesystem') {
        serverInstance = new ServerClass(options.basePath);
      } else {
        serverInstance = new ServerClass();
      }

      fastmcp.register(serverInstance);
      
      console.log(`Starting ${serverName} (${options.server}) on ${options.transport}...`);
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
    console.log('Usage: fastmcp run --server <type>');
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