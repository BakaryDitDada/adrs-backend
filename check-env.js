import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Environment Check');
console.log('===================');

// Check Node version
const nodeVersion = process.version;
console.log(`Node.js version: ${nodeVersion}`);
if (!nodeVersion.startsWith('v18') && !nodeVersion.startsWith('v20')) {
    console.warn('⚠️  Warning: Node.js 18 or 20 is recommended');
}

// Check TypeScript config
try {
    const tsconfig = JSON.parse(readFileSync(join(__dirname, 'tsconfig.json'), 'utf8'));
    console.log('✅ TypeScript config: OK');
    console.log(`   Target: ${tsconfig.compilerOptions.target}`);
    console.log(`   Module: ${tsconfig.compilerOptions.module}`);
} catch (error) {
    console.error('❌ TypeScript config: ERROR', error.message);
}

// Check package.json
try {
    const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
    console.log('✅ Package.json: OK');
    console.log(`   Type: ${pkg.type || 'commonjs'}`);
    
    // Check scripts
    if (pkg.scripts.dev && pkg.scripts.dev.includes('nodemon')) {
        console.log('✅ Nodemon script: OK');
    } else {
        console.warn('⚠️  Nodemon script might be missing');
    }
} catch (error) {
    console.error('❌ Package.json: ERROR', error.message);
}

// Check for .env
try {
    require('dotenv').config();
    console.log('✅ Environment variables loaded');
    
    const required = ['NODE_ENV', 'PORT', 'MONGODB_URI'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length === 0) {
        console.log('✅ Required env variables: OK');
    } else {
        console.error(`❌ Missing env variables: ${missing.join(', ')}`);
    }
} catch (error) {
    console.error('❌ Environment setup: ERROR', error.message);
}

console.log('===================');
console.log('Run: "npm run dev" to start the development server');