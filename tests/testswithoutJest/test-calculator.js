// Test calculator server for CLI file loading
// import { FastMCP } from './src/core/fastmcp.js';

export class TestCalculatorServer {
  constructor() {
    this.name = 'test-calculator';
  }

  async add(a, b) {
    return a + b;
  }

  async subtract(a, b) {
    return a - b;
  }

  async multiply(a, b) {
    return a * b;
  }

  async divide(a, b) {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    return a / b;
  }
}

// Default export
export default TestCalculatorServer;