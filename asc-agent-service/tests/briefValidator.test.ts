/**
 * tests/briefValidator.test.js — Phase 3 Unit Tests
 *
 * Tests the briefValidator module against three scenarios:
 *   1. Complete brief → isValid: true, all 7 fields parsed
 *   2. Missing 1 field → isValid: false, correct field listed
 *   3. Completely empty brief → isValid: false, all 7 fields listed
 *
 * Run with:  node tests/briefValidator.test.js
 */

'use strict';

const { validate, REQUIRED_FIELDS } = require('../modules/briefValidator');

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

// ── Test 1 — Complete, valid brief ───────────────────────────────────────────
console.log('\n[Test 1] Complete brief — should pass validation');
const COMPLETE_BRIEF = `
Product: MeetingGenius
Task Type: Feature
Description: Add a bulk export button for GeniusWords entries to CSV.
Acceptance Criteria: Clicking "Export" downloads a CSV with all visible entries. Works for up to 500 entries without timeout.
Priority: High
Do Not Touch: Authentication module, Stripe integration
Reference Files: src/components/GeniusWords.jsx, src/api/export.js
`.trim();

const result1 = validate(COMPLETE_BRIEF);
assert('isValid is true', result1.isValid === true);
assert('missingFields is empty', result1.missingFields.length === 0);
assert('All 7 fields parsed', Object.keys(result1.parsedFields).length === 7);
assert('Product parsed correctly', result1.parsedFields['Product'] === 'MeetingGenius');
assert('Priority parsed correctly', result1.parsedFields['Priority'] === 'High');

// ── Test 2 — Missing one field (Priority) ────────────────────────────────────
console.log('\n[Test 2] Brief missing "Priority" — should fail with one missing field');
const MISSING_PRIORITY = `
Product: MeetingGenius
Task Type: Feature
Description: Add a bulk export button for GeniusWords entries to CSV.
Acceptance Criteria: Clicking "Export" downloads a CSV with all visible entries.
Do Not Touch: Authentication module
Reference Files: src/components/GeniusWords.jsx
`.trim();

const result2 = validate(MISSING_PRIORITY);
assert('isValid is false', result2.isValid === false);
assert('One field is missing', result2.missingFields.length === 1);
assert('Missing field is "Priority"', result2.missingFields[0] === 'Priority');

// ── Test 3 — Empty text ───────────────────────────────────────────────────────
console.log('\n[Test 3] Empty string — all 7 fields should be missing');
const result3 = validate('');
assert('isValid is false', result3.isValid === false);
assert('All 7 fields listed as missing', result3.missingFields.length === REQUIRED_FIELDS.length);

// ── Test 4 — null input ───────────────────────────────────────────────────────
console.log('\n[Test 4] null input — should not throw, all fields missing');
const result4 = validate(null);
assert('isValid is false', result4.isValid === false);
assert('Returns all missing fields', result4.missingFields.length === REQUIRED_FIELDS.length);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n─────────────────────────────────────`);
console.log(`  Result: ${passed} passed, ${failed} failed`);
console.log(`─────────────────────────────────────\n`);

if (failed > 0) {
  process.exit(1);
}
