/**
 * tests/claudeClient.test.js — Phase 5 Unit Tests
 *
 * This test uses conditional mocking to test the module interface.
 */

'use strict';

const { generateCode } = require('../modules/claudeClient');

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`  ✅  ${description}`);
    passed++;
  } else {
    console.error(`  ❌  ${description}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n[Phase 5] Claude Client — Interface Tests');

  // 1. Check exports
  assert('generateCode is a function', typeof generateCode === 'function');

  // 2. Test missing API key handling
  console.log('\n[Test 1] Error handling on missing API key');
  const originalKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;

  try {
    await generateCode('system', 'user');
    console.error('  ❌ Should have thrown for missing API key');
    failed++;
  } catch (err) {
    assert('Throws error if ANTHROPIC_API_KEY is missing', err.message.includes('ANTHROPIC_API_KEY'));
  }

  // Restore key for subsequent tests
  if (originalKey) process.env.ANTHROPIC_API_KEY = originalKey;
  else process.env.ANTHROPIC_API_KEY = 'mock-key';

  // Note: We don't perform a live API call here. 
  // Integration testing is handled in Phase 18.

  console.log(`\n─────────────────────────────────────`);
  console.log(`  Result: ${passed} passed, ${failed} failed`);
  console.log(`─────────────────────────────────────\n`);

  if (failed > 0) process.exit(1);
}

runTests();
