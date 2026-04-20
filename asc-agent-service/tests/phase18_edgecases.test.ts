/**
 * tests/phase18_edgecases.test.ts — Phase 18 Edge Case Testing
 * 
 * Verifies system safeguards:
 * 1. Incomplete Brief (Task 18.2)
 * 2. Unknown Product (Task 18.3)
 * 3. Escalation Trigger (Task 18.4)
 */

import { validate } from '../modules/briefValidator';
import { checkForEscalation } from '../modules/escalationHandler';
import { assembleContext } from '../modules/contextAssembler';

let passed = 0;
let failed = 0;

function assert(description: string, condition: boolean) {
  if (condition) {
    console.log(`  ✅  ${description}`);
    passed++;
  } else {
    console.error(`  ❌  ${description}`);
    failed++;
  }
}

async function runTests() {
  process.env.GITHUB_TOKEN = 'mock-token';
  process.env.GITHUB_ORG = 'mock-org';
  
  console.log('\n[Phase 18] Edge Case Testing Started...');

  // ── Test 1 — Incomplete Brief (Task 18.2) ──────────────────────────────────
  console.log('\n[Task 18.2] Test: Incomplete brief handling');
  const INCOMPLETE_BRIEF = `
Product: MeetingGenius
Task Type: Bug Fix
Description: Fix the layout issue.
`.trim();
  const validationRes = validate(INCOMPLETE_BRIEF);
  assert('Validation should fail for incomplete brief', validationRes.isValid === false);
  assert('Missing fields list should be populated', validationRes.missingFields.length > 0);
  assert('Missing field "Acceptance Criteria" detected', validationRes.missingFields.includes('Acceptance Criteria'));


  // ── Test 2 — Unknown Product (Task 18.3) ────────────────────────────────────
  console.log('\n[Task 18.3] Test: Unknown product handling');
  try {
    await assembleContext('UnknownApp', 'src/index.js');
    assert('Should have thrown an error for unknown product', false);
  } catch (e: any) {
    assert('Error message mentions Repositories dashboard', e.message.includes('Repositories dashboard'));
  }


  // ── Test 3 — Escalation Trigger: Sensitive Keyword (Task 18.4) ────────────
  console.log('\n[Task 18.4] Test: Escalation trigger for "auth" keyword');
  const SENSITIVE_BRIEF = {
    'Product': 'MeetingGenius',
    'Description': 'Update the authentication module to support OAuth2 keywords.'
  };
  const escalationRes = checkForEscalation(SENSITIVE_BRIEF);
  assert('Escalation should be triggered', escalationRes.escalated === true);
  assert('Reason mentions sensitivity area', escalationRes.reason !== null && escalationRes.reason.includes('sensitive area: "auth"'));


  // ── Test 4 — Escalation Trigger: Ambiguity ─────────────────────────────────
  console.log('\n[Task 18.4] Test: Escalation trigger for "ambiguous" keyword');
  const AMBIGUOUS_BRIEF = {
    'Product': 'MeetingGenius',
    'Description': 'I am not sure what to do here, the requirements are ambiguous.'
  };
  const escapeRes = checkForEscalation(AMBIGUOUS_BRIEF);
  assert('Escalation should be triggered for ambiguity', escapeRes.escalated === true);
  assert('Reason mentions ambiguity', escapeRes.reason !== null && escapeRes.reason.includes('ambiguous'));


  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log(`\n─────────────────────────────────────`);
  console.log(`  Phase 18 Edge Cases: ${passed} passed, ${failed} failed`);
  console.log(`─────────────────────────────────────\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
