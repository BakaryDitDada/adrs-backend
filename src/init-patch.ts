// init-patch.js
import { fetch as undiciFetch, Agent, setGlobalDispatcher } from 'undici';

const TWENTY_MINUTES = 20 * 60 * 1000;

const timeoutAgent = new Agent({
  headersTimeout: TWENTY_MINUTES, 
  bodyTimeout: TWENTY_MINUTES,    
  connectTimeout: 60 * 1000,     
});

// 1. Override the global fetch pointer for explicit/isolated dependency calls
globalThis.fetch = (input: any | URL, init?: RequestInit) => {
  return undiciFetch(input, {
    ...init,
    dispatcher: timeoutAgent,
  } as any) as any;
};

// 2. Override the fallback dispatcher for internal runtime network streams
setGlobalDispatcher(timeoutAgent);

console.info("🛡️ Network timeout overrides successfully injected (20M Limit).");