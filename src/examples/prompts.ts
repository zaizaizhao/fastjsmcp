import { FastMCP, prompt, Schema } from '../index.js';

/**
 * Prompt server example demonstrating prompt usage
 */
class PromptServer {
  @prompt({
    name: 'code_review',
    description: 'Generate a code review prompt for the given code',
    arguments: [{
      name: 'code',
      description: 'The code to review',
      required: true,
    }, {
      name: 'language',
      description: 'Programming language',
      required: false,
    }, {
      name: 'focus',
      description: 'Specific focus area',
      required: false,
    }],
  })
  async codeReview(args: { code: string; language?: string; focus?: string[] }) {
    const language = args.language || 'unknown';
    const focusAreas = args.focus || ['correctness', 'performance', 'readability', 'security'];
    
    const focusText = focusAreas.map(area => `- ${area}`).join('\n');
    
    return {
      description: `Code review for ${language} code`,
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please review the following ${language} code and provide feedback focusing on:\n${focusText}\n\nCode to review:\n\`\`\`${language}\n${args.code}\n\`\`\`\n\nPlease provide:\n1. Overall assessment\n2. Specific issues found\n3. Suggestions for improvement\n4. Best practices recommendations`,
          },
        },
      ],
    };
  }

  @prompt({
    name: 'explain_concept',
    description: 'Generate a prompt to explain a programming concept',
    arguments: [{
      name: 'concept',
      description: 'The concept to explain',
      required: true,
    }, {
      name: 'level',
      description: 'Difficulty level',
      required: false,
    }, {
      name: 'examples',
      description: 'Include examples',
      required: false,
    }],
  })
  async explainConcept(args: { concept: string; level?: string; examples?: boolean }) {
    const level = args.level || 'beginner';
    const includeExamples = args.examples !== false;
    
    return {
      content: [{
        type: 'text' as const,
        text: `Explain the concept of "${args.concept}" for a ${level} level audience.${includeExamples ? ' Include practical examples and use cases.' : ''}`,
      }],
    };
  }

  @prompt({
    name: 'debug_help',
    description: 'Generate a debugging help prompt',
    arguments: [{
      name: 'error',
      description: 'The error message',
      required: true,
    }, {
      name: 'code',
      description: 'Related code',
      required: false,
    }, {
      name: 'context',
      description: 'Additional context',
      required: false,
    }],
  })
  async debugHelp(args: { error: string; code?: string; context?: string }) {
    let prompt = `Help me debug this error: ${args.error}`;
    
    if (args.code) {
      prompt += `\n\nCode:\n${args.code}`;
    }
    
    if (args.context) {
      prompt += `\n\nContext: ${args.context}`;
    }
    
    prompt += '\n\nPlease provide:\n1. Possible causes\n2. Step-by-step debugging approach\n3. Potential solutions';
    
    return {
      content: [{
        type: 'text' as const,
        text: prompt,
      }],
    };
  }

  @prompt({
    name: 'api_design',
    description: 'Generate a prompt for API design review',
    arguments: [{
      name: 'endpoint',
      description: 'API endpoint',
      required: true,
    }, {
      name: 'method',
      description: 'HTTP method',
      required: true,
    }, {
      name: 'purpose',
      description: 'API purpose',
      required: true,
    }],
  })
  async apiDesign(args: { endpoint: string; method: string; purpose: string }) {
    return {
      content: [{
        type: 'text' as const,
        text: `Review this API design:\n\nEndpoint: ${args.method} ${args.endpoint}\nPurpose: ${args.purpose}\n\nPlease evaluate:\n1. RESTful design principles\n2. Naming conventions\n3. HTTP method appropriateness\n4. Potential improvements`,
      }],
    };
  }

  @prompt({
    name: 'learning_path',
    description: 'Generate a learning path for a technology or concept',
    arguments: [{
      name: 'topic',
      description: 'Learning topic',
      required: true,
    }, {
      name: 'currentLevel',
      description: 'Current skill level',
      required: false,
    }, {
      name: 'timeframe',
      description: 'Learning timeframe',
      required: false,
    }],
  })
  async learningPath(args: { topic: string; currentLevel?: string; timeframe?: string; goals?: string[] }) {
    const level = args.currentLevel || 'beginner';
    const timeframe = args.timeframe || '3 months';
    
    return {
      content: [{
        type: 'text' as const,
        text: `Create a learning path for "${args.topic}" (${level} level, ${timeframe} timeframe). Include: 1. Prerequisites 2. Step-by-step progression 3. Resources 4. Projects 5. Milestones`,
      }],
    };
  }
}

// Example usage
if (require.main === module) {
  const server = new FastMCP({
    name: 'prompt-server',
    version: '1.0.0',
    logging: {
      level: 'info',
    },
  });

  server.register(new PromptServer());
  server.run().catch(console.error);
}

export { PromptServer };