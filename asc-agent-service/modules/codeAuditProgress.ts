'use strict';

/** Activity events for code audit SSE (matches client StreamActivity). */
export interface CodeAuditActivity {
  kind: 'step' | 'commit' | 'file' | 'status';
  message: string;
  path?: string;
  status?: 'checking' | 'present' | 'missing';
}

export type CodeAuditActivityHandler = (ev: CodeAuditActivity) => void;
