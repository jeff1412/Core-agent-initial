'use strict';

/**
 * modules/envConfig.ts — Environment Configuration Validator
 */

const PHASE_1_REQUIRED = ['PORT', 'NODE_ENV'];
const FULL_REQUIRED = [
  'GITHUB_TOKEN',
  'GITHUB_ORG',
  'ANTHROPIC_API_KEY',
  'MATTERMOST_URL',
  'MATTERMOST_BOT_TOKEN',
];

export function validatePhase1() {
  const missing = PHASE_1_REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.warn(`[envConfig] Warning: Missing variables: ${missing.join(', ')}`);
  }
}

export function validateFull() {
  const allRequired = [...PHASE_1_REQUIRED, ...FULL_REQUIRED];
  const missing = allRequired.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`[envConfig] Missing required variables: ${missing.join(', ')}`);
  }
}

export function get(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[envConfig] Missing environment variable: ${key}`);
  }
  return value;
}
