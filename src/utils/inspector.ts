import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';

/**
 * Inspector configuration interface
 */
export interface InspectorConfig {
  filepath: string;
  port?: number;
  proxyPort?: number;
  transport?: string;
  env?: Record<string, string>;
  args?: string[];
  config?: string;
  autoOpen?: boolean;
  timeout?: number;
}

/**
 * Inspector configuration file interface
 */
export interface InspectorConfigFile {
  port?: number;
  proxyPort?: number;
  transport?: string;
  env?: Record<string, string>;
  args?: string[];
  autoOpen?: boolean;
  timeout?: number;
}

/**
 * Check if a port is available
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Find an available port starting from the given port
 */
export async function findAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

/**
 * Validate server file path and extension
 */
export function validateServerFile(filepath: string): { isValid: boolean; error?: string; ext?: string } {
  const resolvedPath = path.resolve(filepath);
  
  // Check if file exists
  if (!fs.existsSync(resolvedPath)) {
    return { isValid: false, error: `File not found: ${resolvedPath}` };
  }
  
  // Check if it's a file (not directory)
  const stats = fs.statSync(resolvedPath);
  if (!stats.isFile()) {
    return { isValid: false, error: `Path is not a file: ${resolvedPath}` };
  }
  
  // Check file extension
  const ext = path.extname(resolvedPath);
  const supportedExtensions = ['.js', '.ts', '.mjs', '.cjs'];
  
  if (!supportedExtensions.includes(ext)) {
    return { 
      isValid: false, 
      error: `Unsupported file extension: ${ext}. Supported extensions: ${supportedExtensions.join(', ')}` 
    };
  }
  
  return { isValid: true, ext };
}

/**
 * Determine the appropriate runtime for the file
 */
export function getRuntime(filepath: string): string {
  const ext = path.extname(filepath);
  
  switch (ext) {
    case '.ts':
      // Check if tsx is available, otherwise use node with ts-node
      return 'tsx';
    case '.mjs':
      return 'node';
    case '.cjs':
      return 'node';
    case '.js':
    default:
      return 'node';
  }
}

/**
 * Load configuration from file
 */
export async function loadConfigFile(configPath: string): Promise<InspectorConfigFile> {
  try {
    const resolvedPath = path.resolve(configPath);
    
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Configuration file not found: ${resolvedPath}`);
    }
    
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    const config = JSON.parse(content);
    
    // Validate configuration structure
    if (typeof config !== 'object' || config === null) {
      throw new Error('Configuration file must contain a JSON object');
    }
    
    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in configuration file: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Merge configuration from multiple sources
 */
export function mergeConfig(
  baseConfig: Partial<InspectorConfig>,
  fileConfig?: InspectorConfigFile,
  cliOptions?: Partial<InspectorConfig>
): InspectorConfig {
  const merged: InspectorConfig = {
    filepath: baseConfig.filepath || '',
    port: 6274,
    proxyPort: 6277,
    transport: 'stdio',
    env: {},
    args: [],
    autoOpen: true,
    timeout: 30000,
    ...baseConfig,
    ...fileConfig,
    ...cliOptions,
  };
  
  // Merge environment variables
  if (baseConfig.env || fileConfig?.env || cliOptions?.env) {
    merged.env = {
      ...baseConfig.env,
      ...fileConfig?.env,
      ...cliOptions?.env,
    };
  }
  
  // Merge arguments
  if (baseConfig.args || fileConfig?.args || cliOptions?.args) {
    merged.args = [
      ...(baseConfig.args || []),
      ...(fileConfig?.args || []),
      ...(cliOptions?.args || []),
    ];
  }
  
  return merged;
}

/**
 * Parse environment variables from string array
 */
export function parseEnvVars(envStrings: string[]): Record<string, string> {
  const env: Record<string, string> = {};
  
  for (const envString of envStrings) {
    const equalIndex = envString.indexOf('=');
    if (equalIndex === -1) {
      throw new Error(`Invalid environment variable format: ${envString}. Expected format: KEY=value`);
    }
    
    const key = envString.substring(0, equalIndex);
    const value = envString.substring(equalIndex + 1);
    
    if (!key) {
      throw new Error(`Invalid environment variable format: ${envString}. Key cannot be empty`);
    }
    
    env[key] = value;
  }
  
  return env;
}

/**
 * Open URL in default browser
 */
export async function openBrowser(url: string): Promise<void> {
  const { spawn } = await import('child_process');
  
  let command: string;
  let args: string[];
  
  switch (process.platform) {
    case 'darwin':
      command = 'open';
      args = [url];
      break;
    case 'win32':
      command = 'cmd';
      args = ['/c', 'start', url];
      break;
    default:
      command = 'xdg-open';
      args = [url];
      break;
  }
  
  try {
    spawn(command, args, { detached: true, stdio: 'ignore' });
  } catch (error) {
    console.warn(`Failed to open browser: ${error}`);
  }
}

/**
 * Format duration in human readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Create a timeout promise
 */
export function createTimeout(ms: number, message?: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(message || `Operation timed out after ${formatDuration(ms)}`));
    }, ms);
  });
}