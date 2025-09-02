import { FastMCP, resource, tool, Schema } from '../index.js';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import type { ExecutionContext } from '../types/index.js';

/**
 * File system server example demonstrating resource and tool usage
 */
class FileSystemServer {
  private basePath: string;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  @resource({
    uri: 'file://*',
    name: 'File Content',
    description: 'Read file contents',
  })
  async readFile(uri: string) {
    // Extract file path from URI
    const filePath = uri.replace('file://', '');
    const fullPath = join(this.basePath, filePath);
    
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return {
        contents: [{
          uri,
          mimeType: 'text/plain',
          text: content,
        }],
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  @tool({
    name: 'list_files',
    description: 'List files in a directory',
    inputSchema: Schema.object({
      path: Schema.optional(Schema.string()),
      recursive: Schema.optional(Schema.boolean()),
    }),
  })
  async listFiles(args: { path?: string; recursive?: boolean }, context: ExecutionContext) {
    const targetPath = args.path ? join(this.basePath, args.path) : this.basePath;
    const recursive = args.recursive || false;
    
    try {
      const files = await this.getFiles(targetPath, recursive);
      const fileList = files.map(file => {
        const relativePath = file.replace(this.basePath, '').replace(/^[\/\\]/, '');
        return relativePath || '.';
      }).join('\n');
      
      return {
        content: [{
          type: 'text' as const,
          text: `Files in ${args.path || '.'}:\n${fileList}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error listing files: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  @tool({
    name: 'write_file',
    description: 'Write content to a file',
    inputSchema: Schema.object({
      path: Schema.string(),
      content: Schema.string(),
      createDirs: Schema.optional(Schema.boolean()),
    }),
  })
  async writeFile(args: { path: string; content: string; createDirs?: boolean }, context: ExecutionContext) {
    const fullPath = join(this.basePath, args.path);
    
    try {
      if (args.createDirs) {
        await fs.mkdir(dirname(fullPath), { recursive: true });
      }
      
      await fs.writeFile(fullPath, args.content, 'utf-8');
      
      return {
        content: [{
          type: 'text' as const,
          text: `Successfully wrote ${args.content.length} characters to ${args.path}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error writing file: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  @tool({
    name: 'file_info',
    description: 'Get information about a file or directory',
    inputSchema: Schema.object({
      path: Schema.string(),
    }),
  })
  async fileInfo(args: { path: string }, context: ExecutionContext) {
    const fullPath = join(this.basePath, args.path);
    
    try {
      const stats = await fs.stat(fullPath);
      const info = {
        path: args.path,
        size: stats.size,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        accessed: stats.atime.toISOString(),
      };
      
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(info, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error getting file info: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  private async getFiles(dirPath: string, recursive: boolean): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      
      if (entry.isFile()) {
        files.push(fullPath);
      } else if (entry.isDirectory() && recursive) {
        const subFiles = await this.getFiles(fullPath, recursive);
        files.push(...subFiles);
      }
    }
    
    return files;
  }
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new FastMCP({
    name: 'filesystem-server',
    version: '1.0.0',
    logging: {
      level: 'info',
    },
  });

  server.register(new FileSystemServer());
  server.run().catch(console.error);
}

export { FileSystemServer };