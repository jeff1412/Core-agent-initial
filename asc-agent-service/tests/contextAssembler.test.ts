/**
 * tests/contextAssembler.test.js — Phase 4 Smoke Tests
 *
 * Tests the contextAssembler module interface without making real GitHub API calls.
 * Validates the shape of the module, error-handling paths, and PRODUCT_REPO_MAP logic.
 *
 * Run with:  node tests/contextAssembler.test.js
 *
 * NOTE: A live integration test (real GitHub fetch) is run in Phase 17 once
 *       GITHUB_TOKEN is configured and the repos exist.
 */

'use strict';

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

// ── Test 1 — Module loads and exports the correct function ───────────────────
console.log('\n[Test 1] Module interface check');
const { assembleContext } = require('../modules/contextAssembler');
assert('assembleContext is exported', typeof assembleContext === 'function');
assert('assembleContext is async (returns a Promise)', assembleContext.constructor.name === 'AsyncFunction');

// ── Test 2 — Throws when GITHUB_TOKEN is missing ─────────────────────────────
console.log('\n[Test 2] Throws on missing GITHUB_TOKEN');
const originalToken = process.env.GITHUB_TOKEN;
const originalOrg   = process.env.GITHUB_ORG;

delete process.env.GITHUB_TOKEN;
delete process.env.GITHUB_ORG;

assembleContext('MeetingGenius', [])
  .then(() => {
    console.error('  ❌  Should have thrown but did not');
    failed++;
    runTest3(originalToken, originalOrg);
  })
  .catch(err => {
    assert('Throws when GITHUB_TOKEN is not set', err.message.includes('GITHUB_TOKEN'));
    runTest3(originalToken, originalOrg);
  });

function runTest3(originalToken, originalOrg) {
  // ── Test 3 — Throws on unknown product ─────────────────────────────────────
  console.log('\n[Test 3] Throws on unknown product name');
  process.env.GITHUB_TOKEN = 'fake-token-for-test';
  process.env.GITHUB_ORG   = 'ASC-Creative';

  assembleContext('NonExistentProduct', [])
    .then(() => {
      console.error('  ❌  Should have thrown but did not');
      failed++;
      printSummary(originalToken, originalOrg);
    })
    .catch(err => {
      assert('Throws on unknown product', err.message.includes('Unknown product'));
      printSummary(originalToken, originalOrg);
    });
}

function printSummary(originalToken, originalOrg) {
  // Restore env vars
  if (originalToken) process.env.GITHUB_TOKEN = originalToken;
  else delete process.env.GITHUB_TOKEN;
  if (originalOrg) process.env.GITHUB_ORG = originalOrg;
  else delete process.env.GITHUB_ORG;
  
  console.log(`\n─────────────────────────────────────`);
  console.log(`  Result: ${passed} passed, ${failed} failed`);
  console.log(`─────────────────────────────────────\n`);
  if (failed > 0) process.exit(1);
}
