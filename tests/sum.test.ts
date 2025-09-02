/**
 * Test file for the corrected Sum function decorator usage
 */

import { mcp, Sum } from './sum.js';

describe('Sum Function Decorator Test', () => {
  test('should register Sum tool correctly', () => {
    // Check if the tool is registered in the FastMCP instance
    const tools = Array.from(mcp['registry'].tools.keys());
    expect(tools).toContain('sum');
  });

  test('should execute Sum function correctly', async () => {
    const result = await Sum({ a: 5, b: 3 });
    
    expect(result).toHaveProperty('content');
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toHaveProperty('type', 'text');
    expect(result.content[0]).toHaveProperty('text', '5 + 3 = 8');
  });

  test('should handle negative numbers', async () => {
    const result = await Sum({ a: -2, b: 7 });
    
    expect(result.content[0].text).toBe('-2 + 7 = 5');
  });

  test('should handle decimal numbers', async () => {
    const result = await Sum({ a: 3.5, b: 2.1 });
    
    expect(result.content[0].text).toBe('3.5 + 2.1 = 5.6');
  });
});