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
import { spawn } from 'child_process';
import { 
  validateServerFile, 
  getRuntime, 
  checkTsxAvailable,
  isPortAvailable, 
  findAvailablePort, 
  loadConfigFile, 
  mergeConfig, 
  parseEnvVars, 
  openBrowser, 
  formatDuration,
  createTimeout,
  type InspectorConfig 
} from './utils/inspector.js';
const VERSION = '1.0.0';

// 全局变量跟踪信号监听器状态
let signalHandlersAdded = false;
let currentFastMCP: FastMCP | null = null;
let currentInspectorProcess: any = null;

// Available server examples
const SERVERS = {
  calculator: CalculatorServer,
  filesystem: FileSystemServer,
  prompts: PromptServer,
  comprehensive: ComprehensiveServer,
};

program
  .name('fastjsmcp')
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
    console.log('FastMCP server examples:');
    console.log('');
    Object.keys(SERVERS).forEach(name => {
      console.log(`  ${name.padEnd(15)} - ${getServerDescription(name)}`);
    });
    console.log('');
    console.log('Usage: fastjsmcp --server <type> or fastjsmcp run --server <type>');
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


program
  .command('inspect')
  .description('Launch MCP Inspector to test and debug your server')
  .argument('<file>', 'Server file to inspect')
  .option('-p, --port <port>', 'Inspector port', '6274')
  .option('--proxy-port <port>', 'Proxy port for server communication', '6277')
  .option('-t, --transport <type>', 'Transport type (stdio, sse)', 'stdio')
  .option('-c, --config <file>', 'Configuration file path')
  .option('-e, --env <vars...>', 'Environment variables (KEY=value format)')
  .option('-a, --args <args...>', 'Additional arguments to pass to the server')
  .option('--no-open', 'Do not automatically open browser')
  .option('--timeout <ms>', 'Timeout for server startup (ms)', '30000')
  .action(async (file, options) => {
    await runInspector(file, options);
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

        // For TypeScript files, use child process with tsx runtime
        if (ext === '.ts') {
          console.log(`🚀 Running TypeScript server: ${filePath}`);
          await runTypeScriptServer(filePath, options);
          return;
        }

        try {
          // Dynamic import for ES modules and JavaScript files
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
      
      // 保存当前实例引用
      currentFastMCP = fastmcp;
      
      // Handle graceful shutdown - 只添加一次
      if (!signalHandlersAdded) {
        process.on('SIGINT', async () => {
          console.log('\nShutting down server...');
          if (currentFastMCP) {
            await currentFastMCP.stop();
            currentFastMCP = null;
          }
          process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
          console.log('\nShutting down server...');
          if (currentFastMCP) {
            await currentFastMCP.stop();
            currentFastMCP = null;
          }
          process.exit(0);
        });
        
        signalHandlersAdded = true;
      }
      
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
}

/**
 * Run TypeScript server using tsx runtime
 */
async function runTypeScriptServer(filePath: string, options: any): Promise<void> {
  try {
    // Check if tsx is available
    const runtime = getRuntime(filePath);
    console.log(`🔧 Checking runtime availability: ${runtime}`);
    
    const tsxCheck = await checkTsxAvailable();
    if (!tsxCheck.available) {
      console.error(`❌ ${tsxCheck.error}`);
      console.error('\n💡 To install tsx globally:');
      console.error('   npm install -g tsx');
      console.error('   or');
      console.error('   pnpm add -g tsx');
      console.error('   or');
      console.error('   yarn global add tsx');
      process.exit(1);
    }
    
    console.log(`✅ Runtime ${runtime} is available`);
    
    // Prepare environment variables
    const env = {
      ...process.env,
      // Pass CLI options as environment variables for the server to use
      FASTMCP_SERVER_NAME: options.name || path.basename(filePath, '.ts') + '-server',
      FASTMCP_SERVER_VERSION: options.serverVersion || '1.0.0',
      FASTMCP_TRANSPORT_TYPE: options.transport || 'stdio',
      FASTMCP_TRANSPORT_PORT: options.port || '3000',
      FASTMCP_TRANSPORT_HOST: options.host || 'localhost',
      FASTMCP_LOG_LEVEL: options.logLevel || 'info',
      FASTMCP_LOG_FORMAT: options.logFormat || 'simple',
      FASTMCP_BASE_PATH: options.basePath || process.cwd(),
    };

    // Prepare arguments for tsx
    const args = [filePath];
    
    console.log(`📝 Command: ${runtime} ${args.join(' ')}`);
    console.log(`📁 Working directory: ${process.cwd()}`);
    
    // Spawn the TypeScript server process
    const serverProcess = spawn(runtime, args, {
      env,
      stdio: 'inherit',
      shell: true,
    });

    // Save current process reference
    currentFastMCP = null; // We don't have a FastMCP instance in this case
    currentInspectorProcess = serverProcess;

    // Handle process events
    serverProcess.on('error', (error) => {
      if (error.message.includes('ENOENT')) {
        console.error(`❌ Runtime '${runtime}' not found. Please install tsx:`);
        console.error('   npm install -g tsx');
        console.error('   or');
        console.error('   pnpm add -g tsx');
      } else {
        console.error(`❌ Failed to start TypeScript server: ${error.message}`);
      }
      process.exit(1);
    });

    serverProcess.on('exit', (code, signal) => {
      if (signal) {
        console.log(`\n📋 Server process terminated by signal: ${signal}`);
      } else if (code !== 0) {
        console.error(`❌ Server process exited with code: ${code}`);
        process.exit(code || 1);
      } else {
        console.log('\n✅ Server process exited successfully');
      }
      currentInspectorProcess = null;
    });

    // Setup signal handlers for graceful shutdown - only add once
    if (!signalHandlersAdded) {
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down TypeScript server...');
        if (currentInspectorProcess) {
          currentInspectorProcess.kill('SIGTERM');
          currentInspectorProcess = null;
        }
        process.exit(0);
      });
      
      process.on('SIGTERM', () => {
        console.log('\n🛑 Shutting down TypeScript server...');
        if (currentInspectorProcess) {
          currentInspectorProcess.kill('SIGTERM');
          currentInspectorProcess = null;
        }
        process.exit(0);
      });
      
      signalHandlersAdded = true;
    }

    // Keep the process alive
    await new Promise<void>((resolve) => {
      serverProcess.on('exit', () => resolve());
    });

  } catch (error) {
    console.error(`❌ Failed to run TypeScript server: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Run MCP Inspector for testing and debugging
 */
async function runInspector(file: string, options: any): Promise<void> {
  try {
    console.log('🔍 Starting MCP Inspector...\n');
    
    // Step 1: Validate server file
    console.log('📁 Validating server file...');
    const validation = validateServerFile(file);
    if (!validation.isValid) {
      console.error(`❌ ${validation.error}`);
      process.exit(1);
    }
    console.log(`✅ Server file validated: ${path.resolve(file)}`);
    
    // Step 2: Load configuration file if specified
    let fileConfig = {};
    if (options.config) {
      console.log('📄 Loading configuration file...');
      try {
        fileConfig = await loadConfigFile(options.config);
        console.log(`✅ Configuration loaded from: ${options.config}`);
      } catch (error) {
         console.error(`❌ Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
         process.exit(1);
       }
    }
    
    // Step 3: Parse environment variables
    let envVars = {};
    if (options.env && options.env.length > 0) {
      console.log('🌍 Parsing environment variables...');
      try {
        envVars = parseEnvVars(options.env);
        console.log(`✅ Parsed ${Object.keys(envVars).length} environment variables`);
      } catch (error) {
         console.error(`❌ Failed to parse environment variables: ${error instanceof Error ? error.message : String(error)}`);
         process.exit(1);
       }
    }
    
    // Step 4: Merge configuration
    const config = mergeConfig(
      { filepath: file },
      fileConfig,
      {
        port: options.port ? parseInt(options.port) : undefined,
        proxyPort: options.proxyPort ? parseInt(options.proxyPort) : undefined,
        transport: options.transport,
        env: envVars,
        args: options.args || [],
        autoOpen: options.open !== false,
        timeout: parseInt(options.timeout),
      }
    );
    
    // Step 5: Check port availability
    console.log('🔌 Checking port availability...');
    
    // Check inspector port
    if (!(await isPortAvailable(config.port!))) {
      console.log(`⚠️  Port ${config.port} is not available, finding alternative...`);
      try {
        config.port = await findAvailablePort(config.port!);
        console.log(`✅ Using alternative port: ${config.port}`);
      } catch (error) {
         console.error(`❌ No available ports found: ${error instanceof Error ? error.message : String(error)}`);
         process.exit(1);
       }
    } else {
      console.log(`✅ Inspector port ${config.port} is available`);
    }
    
    // Check proxy port
    if (!(await isPortAvailable(config.proxyPort!))) {
      console.log(`⚠️  Proxy port ${config.proxyPort} is not available, finding alternative...`);
      try {
        config.proxyPort = await findAvailablePort(config.proxyPort!);
        console.log(`✅ Using alternative proxy port: ${config.proxyPort}`);
      } catch (error) {
         console.error(`❌ No available proxy ports found: ${error instanceof Error ? error.message : String(error)}`);
         process.exit(1);
       }
    } else {
      console.log(`✅ Proxy port ${config.proxyPort} is available`);
    }
    
    // Step 6: Determine runtime
    const runtime = getRuntime(config.filepath);
    console.log(`🚀 Using runtime: ${runtime}`);
    
    // Step 7: Prepare inspector command
    const inspectorUrl = `http://localhost:${config.port}`;
    console.log('\n📋 Configuration Summary:');
    console.log(`   Server file: ${config.filepath}`);
    console.log(`   Runtime: ${runtime}`);
    console.log(`   Transport: ${config.transport}`);
    console.log(`   Inspector port: ${config.port}`);
    console.log(`   Proxy port: ${config.proxyPort}`);
    console.log(`   Inspector URL: ${inspectorUrl}`);
    if (Object.keys(config.env!).length > 0) {
      console.log(`   Environment variables: ${Object.keys(config.env!).join(', ')}`);
    }
    if (config.args!.length > 0) {
      console.log(`   Additional arguments: ${config.args!.join(' ')}`);
    }
    
    // Step 8: Launch inspector
    console.log('\n🔧 Launching MCP Inspector...');
    
    const { spawn } = await import('child_process');
    
    // Prepare environment
    const env = {
      ...process.env,
      ...config.env,
    };
    
    // Prepare inspector arguments
    const inspectorArgs = [
      '@modelcontextprotocol/inspector',
      runtime,
      path.resolve(config.filepath),
      ...config.args!,
    ];
    
    // Set inspector configuration via environment variables
    env.MCP_INSPECTOR_PORT = config.port!.toString();
    env.MCP_INSPECTOR_PROXY_PORT = config.proxyPort!.toString();
    env.MCP_INSPECTOR_TRANSPORT = config.transport!;
    
    console.log(`📝 Command: npx ${inspectorArgs.join(' ')}`);
    
    // Launch inspector process
    const inspectorProcess = spawn('npx', inspectorArgs, {
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
    });
    
    // 保存当前进程引用
    currentInspectorProcess = inspectorProcess;
    
    let inspectorReady = false;
    const startTime = Date.now();
    
    // Handle inspector output
    inspectorProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(output);
      
      // Check if inspector is ready - look for more specific patterns
      if (output.includes('Inspector running') || 
          output.includes('Server started') || 
          output.includes('listening on') ||
          output.includes('Inspector server started') ||
          output.includes(`http://localhost:${config.port}`)) {
        inspectorReady = true;
      }
    });
    
    inspectorProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      process.stderr.write(output);
    });
    
    // Handle process events
    inspectorProcess.on('error', (error) => {
      console.error(`❌ Failed to start inspector: ${error.message}`);
      process.exit(1);
    });
    
    inspectorProcess.on('exit', (code) => {
      if (code !== 0) {
        console.error(`❌ Inspector exited with code ${code}`);
        process.exit(code || 1);
      }
    });
    
    // Wait for inspector to be ready or timeout
    const timeoutPromise = createTimeout(config.timeout!, `Inspector failed to start within ${formatDuration(config.timeout!)}`);
    const readyPromise = new Promise<void>((resolve) => {
      const checkReady = () => {
        if (inspectorReady) {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
    
    try {
      await Promise.race([readyPromise, timeoutPromise]);
      const elapsed = Date.now() - startTime;
      console.log(`\n✅ Inspector started successfully in ${formatDuration(elapsed)}`);
      console.log(`🌐 Inspector URL: ${inspectorUrl}`);
      
      // Open browser if requested
      if (config.autoOpen) {
        console.log('🌐 Opening browser...');
        await openBrowser(inspectorUrl);
      }
      
      console.log('\n💡 Tips:');
      console.log('   - Use Ctrl+C to stop the inspector');
      console.log('   - The inspector will automatically reload when you modify your server file');
      console.log('   - Check the browser console for any client-side errors');
      
      // Keep the process running - 只添加一次监听器
      if (!signalHandlersAdded) {
        process.on('SIGINT', () => {
          console.log('\n🛑 Stopping inspector...');
          if (currentInspectorProcess) {
            currentInspectorProcess.kill('SIGTERM');
            currentInspectorProcess = null;
          }
          process.exit(0);
        });
        
        process.on('SIGTERM', () => {
          if (currentInspectorProcess) {
            currentInspectorProcess.kill('SIGTERM');
            currentInspectorProcess = null;
          }
          process.exit(0);
        });
        
        signalHandlersAdded = true;
      }
      
    } catch (error) {
       console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
       if (currentInspectorProcess) {
         currentInspectorProcess.kill('SIGTERM');
         currentInspectorProcess = null;
       }
       process.exit(1);
     }
    
  } catch (error) {
     console.error(`❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
     process.exit(1);
   }
}

// Parse command line arguments
program.parse();