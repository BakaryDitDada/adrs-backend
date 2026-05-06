import { rmSync, existsSync } from 'fs';
import { join } from 'path';

const itemsToRemove = [
  'dist',
  'tsconfig.tsbuildinfo',
  'node_modules/.cache'
];

console.log('Cleaning build artifacts...');
// "clean": "rm -rf dist node_modules/.cache && rm -f tsconfig.tsbuildinfo",

itemsToRemove.forEach(item => {
  const fullPath = join(process.cwd(), item);
  if (existsSync(fullPath)) {
    rmSync(fullPath, { recursive: true, force: true });
    console.log(`✓ Removed: ${item}`);
  }
});

console.log('Clean complete!');