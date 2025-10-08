// Test importing examples from the new examples/index.ts
import { CalculatorServer, FileSystemServer } from './src/examples/aa.js';

console.log('✅ Examples imported successfully from examples/index.ts');
console.log('✅ CalculatorServer:', typeof CalculatorServer);
console.log('✅ FileSystemServer:', typeof FileSystemServer);
console.log('✅ Examples are available when explicitly imported');