'use strict';

/**
 * modules/escalationManager.ts — Manage human-review triggers
 */

export interface EscalationRecord {
  id: string;
  timestamp: string;
  product: string;
  reason: string;
  module: string;
  recommendation: string;
  status: 'pending' | 'resolved';
}

let escalations: EscalationRecord[] = [];

/**
 * recordEscalation(reason, product, module, recommendation)
 */
export function recordEscalation(reason: string, product: string, module: string, recommendation: string): EscalationRecord {
  const escalation: EscalationRecord = {
    id: 'esc-' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    product: product || 'Unknown',
    reason,
    module: module || 'Multiple/Unknown',
    recommendation: recommendation || 'Manual review of the task brief and codebase is recommended.',
    status: 'pending'
  };
  
  escalations.unshift(escalation);
  
  if (escalations.length > 50) {
    escalations.pop();
  }
  
  return escalation;
}

export function getEscalations(): EscalationRecord[] {
  return escalations;
}

export function clearEscalation(id: string) {
  escalations = escalations.filter(e => e.id !== id);
}
