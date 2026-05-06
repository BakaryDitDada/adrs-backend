import dotenv from 'dotenv';

import { AiProviderFactory } from './modules/ai/providers/factory.provider.js';
// Load environment variables
dotenv.config();

async function testProvider(providerName: 'openai' | 'deepseek' | 'gemini') {
  console.log(`\n🔍 Testing ${providerName.toUpperCase()} provider...`);
  try {
    const provider = AiProviderFactory.create(providerName);
    const model = provider.getModel();
    const response = await model.invoke([
      { role: 'user', content: 'Dis bonjour en français' }
    ]);
    console.log(`✅ ${providerName}: ${response.content}`);
  } catch (error: any) {
    console.error(`❌ ${providerName} failed:`, error.message);
  }
}

// Test all providers (or comment out the ones you don't have keys for)
async function runTests() {
  await testProvider('openai');
  // await testProvider('deepseek');
  await testProvider('gemini');
}

runTests();
