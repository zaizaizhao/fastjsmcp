import { FastMCP, tool, resource, prompt, Schema } from '../index.js';
import type { ExecutionContext } from '../types/index.js';

/**
 * Comprehensive server example demonstrating all FastMCP features
 */
class ComprehensiveServer {
  private data: Map<string, any> = new Map();
  private memoryStore = new Map<string, string>();
  private counter = 0;

  // === TOOLS ===
  
  @tool({
    name: 'echo',
    description: 'Echo back the input message',
    inputSchema: Schema.object({
      message: Schema.string(),
    }),
  })
  async echo(args: { message: string }) {
    return {
      content: [{
        type: 'text' as const,
        text: `Echo: ${args.message}`,
      }],
    };
  }

  @tool({
    name: 'calculate',
    description: 'Perform mathematical calculations',
    inputSchema: Schema.object({
      expression: Schema.string(),
    }),
  })
  async calculate(args: { expression: string }) {
    try {
      // Simple evaluation for demo purposes
      const result = eval(args.expression);
      return {
        content: [{
          type: 'text' as const,
          text: `Result: ${result}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
      };
    }
  }

  @tool({
    name: 'get_time',
    description: 'Get current time',
    inputSchema: Schema.object({
      timezone: Schema.optional(Schema.string()),
    }),
  })
  async getTime(args: { timezone?: string }) {
    const now = new Date();
    const timeString = now.toLocaleString(undefined, {
      timeZone: args.timezone,
    });
    
    return {
      content: [{
        type: 'text' as const,
        text: `Current time: ${timeString}`,
      }],
    };
  }

  @tool({
    name: 'store_data',
    description: 'Store data with a key',
    inputSchema: Schema.object({
      key: Schema.string(),
      value: Schema.string(),
    }),
  })
  async storeData(args: { key: string; value: string }) {
    this.data.set(args.key, args.value);
    return {
      content: [{
        type: 'text' as const,
        text: `Stored data with key: ${args.key}`,
      }],
    };
  }

  @tool({
    name: 'get_data',
    description: 'Retrieve stored data by key',
    inputSchema: Schema.object({
      key: Schema.string(),
    }),
  })
  async getData(args: { key: string }) {
    const value = this.data.get(args.key);
    return {
      content: [{
        type: 'text' as const,
        text: value !== undefined ? `Value: ${value}` : 'Key not found',
      }],
    };
  }

  @tool({
    name: 'increment_counter',
    description: 'Increment the internal counter',
    inputSchema: Schema.object({
      amount: Schema.optional(Schema.number()),
    }),
  })
  async incrementCounter(args: { amount?: number }) {
    const increment = args.amount || 1;
    this.counter += increment;
    return {
      content: [{
        type: 'text' as const,
        text: `Counter incremented by ${increment}. New value: ${this.counter}`,
      }],
    };
  }

  @tool({
    name: 'generate_uuid',
    description: 'Generate a random UUID',
    inputSchema: Schema.object({}),
  })
  async generateUuid() {
    const uuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    return {
      content: [{
        type: 'text' as const,
        text: `Generated UUID: ${uuid}`,
      }],
    };
  }

  @tool({
    name: 'current_time',
    description: 'Get the current time',
    inputSchema: Schema.object({
      format: Schema.optional(Schema.string()),
    }),
  })
  async currentTime(args: { format?: string; timezone?: string }, context: ExecutionContext) {
    const now = new Date();
    let timeString: string;
    
    if (args.format === 'iso') {
      timeString = now.toISOString();
    } else if (args.format === 'unix') {
      timeString = Math.floor(now.getTime() / 1000).toString();
    } else {
      timeString = now.toLocaleString(undefined, {
        timeZone: args.timezone,
      });
    }
    
    return {
      content: [{
        type: 'text' as const,
        text: `Current time: ${timeString}`,
      }],
    };
  }

  // === RESOURCES ===

  @resource({
    uri: 'config://app',
    name: 'app_config',
    description: 'Application configuration',
  })
  async getAppConfig() {
    return {
      uri: 'config://app',
      mimeType: 'application/json',
      text: JSON.stringify({
        name: 'FastMCP Demo',
        version: '1.0.0',
        features: ['tools', 'resources', 'prompts'],
      }, null, 2),
    };
  }
  
  @resource({
    uri: 'memory://*',
    name: 'memory_resource',
    description: 'Memory-based resources',
  })
  async getMemoryResource(uri: string) {
    const key = uri.replace('memory://', '');
    const value = this.memoryStore.get(key) || 'Resource not found';
    
    return {
      uri,
      mimeType: 'text/plain',
      text: value,
    };
  }

  @resource({
    uri: 'counter://current',
    name: 'counter_value',
    description: 'Current counter value',
  })
  async getCounterResource(uri: string) {
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          counter: this.counter,
          timestamp: new Date().toISOString(),
        }),
      }],
    };
  }

  @resource({
    uri: 'status://server',
    name: 'server_status',
    description: 'Current server status',
  })
  async getServerStatus(uri: string) {
    const status = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      platform: process.platform,
      dataKeys: Array.from(this.data.keys()),
      counter: this.counter,
      timestamp: new Date().toISOString(),
    };
    
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(status, null, 2),
      }],
    };
  }

  // === PROMPTS ===

  @prompt({
    name: 'data_analysis',
    description: 'Generate data analysis prompts',
    arguments: [{
      name: 'dataset',
      description: 'Dataset to analyze',
      required: true,
    }, {
      name: 'type',
      description: 'Analysis type',
      required: false,
    }],
  })
  async data_analysis(args: { dataset: string; type?: string }) {
    return {
      content: [{
        type: 'text' as const,
        text: `Analyze the dataset "${args.dataset}" and provide insights on patterns, trends, and anomalies. Focus on ${args.type || 'general analysis'}.`,
      }],
    };
  }

  @prompt({
    name: 'server_report',
    description: 'Generate server status reports',
    arguments: [{
      name: 'includeMetrics',
      description: 'Include performance metrics',
      required: false,
    }, {
      name: 'format',
      description: 'Report format',
      required: false,
    }],
  })
  async serverReportPrompt(args: { includeMetrics?: boolean; format?: string }) {
    const includeMetrics = args.includeMetrics !== false;
    
    const status = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      dataEntries: this.data.size,
      counter: this.counter,
    };
    
    let prompt = `Please analyze the following server status and provide a summary:\n\n`;
    prompt += `Uptime: ${Math.floor(status.uptime)} seconds\n`;
    prompt += `Memory Usage: ${Math.round(status.memory.rss / 1024 / 1024)} MB\n`;
    prompt += `Stored Data Entries: ${status.dataEntries}\n`;
    prompt += `Counter Value: ${status.counter}\n\n`;
    
    if (includeMetrics) {
      prompt += 'Please include detailed performance metrics.';
    }
    
    prompt += ` Format: ${args.format || 'standard'}.`;
    
    return {
      description: 'Server status report',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: prompt,
          },
        },
      ],
    };
  }
}

// Example usage
if (require.main === module) {
  const server = new FastMCP({
    name: 'comprehensive-server',
    version: '1.0.0',
    logging: {
      level: 'info',
    },
  });

  server.register(new ComprehensiveServer());
  server.run().catch(console.error);
}

export { ComprehensiveServer };