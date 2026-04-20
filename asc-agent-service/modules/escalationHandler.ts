'use strict';

/**
 * modules/escalationHandler.ts — Agent Safety & Escalation Logic
 */

const SENSITIVE_KEYWORDS = [
  'auth', 'login', 'password', 'sign-in', 'signup',
  'payment', 'stripe', 'credit card', 'billing',
  'encrypt', 'decrypt', 'crypto',
  'credential', 'api-key', 'secret',
  'database schema', 'drop table', 'truncate'
];

export interface EscalationCheckResult {
  escalated: boolean;
  reason: string | null;
}

/**
 * checkForEscalation(taskBrief)
 */
export function checkForEscalation(taskBrief: Record<string, string>): EscalationCheckResult {
  const description = (taskBrief['Description'] || '').toLowerCase();
  
  // 1. Scan for sensitive keywords in Description
  for (const keyword of SENSITIVE_KEYWORDS) {
    if (description.includes(keyword)) {
      return {
        escalated: true,
        reason: `Task involves a sensitive area: "${keyword}". Manual review required per AGENT.md Section 7.`
      };
    }
  }

  // 2. Check for "Ambiguous" flag
  if (description.includes('ambiguous') || description.includes('not sure')) {
    return {
      escalated: true,
      reason: 'Task scope appears ambiguous. Manual clarification required.'
    };
  }

  // 3. New Integration check
  if (description.includes('integrate') && (description.includes('third party') || description.includes('library'))) {
    return {
      escalated: true,
      reason: 'Task requires a new third-party integration. Manual architectural review required.'
    };
  }

  return { escalated: false, reason: null };
}
