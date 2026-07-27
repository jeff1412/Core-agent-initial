'use strict';

/**
 * modules/githubTokenStore.ts — Dashboard-managed GitHub token (overrides .env when set)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Octokit } from '@octokit/rest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.join(__dirname, '..', 'github-token.json');

interface TokenStore {
  token: string;
  username: string;
  updatedAt: string;
}

function readStore(): TokenStore | null {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
      if (data.token) return data;
    }
  } catch {
    console.warn('[GitHub Token] Could not read token store');
  }
  return null;
}

function maskToken(token: string): string {
  if (token.length <= 4) return '****';
  return `****${token.slice(-4)}`;
}

/** Returns the active token: dashboard-stored first, then .env fallback */
export function getGithubToken(): string | null {
  const stored = readStore();
  if (stored?.token) return stored.token;
  return process.env.GITHUB_TOKEN || null;
}

export interface GithubTokenStatus {
  configured: boolean;
  source: 'dashboard' | 'env' | null;
  username: string | null;
  updatedAt: string | null;
  masked: string | null;
  hasDashboardToken: boolean;
  hasEnvFallback: boolean;
}

export function getGithubTokenStatus(): GithubTokenStatus {
  const stored = readStore();
  const envToken = process.env.GITHUB_TOKEN || null;
  const activeToken = stored?.token || envToken;

  return {
    configured: !!activeToken,
    source: stored?.token ? 'dashboard' : (envToken ? 'env' : null),
    username: stored?.username || null,
    updatedAt: stored?.updatedAt || null,
    masked: activeToken ? maskToken(activeToken) : null,
    hasDashboardToken: !!stored?.token,
    hasEnvFallback: !!envToken
  };
}

export async function saveGithubToken(token: string): Promise<{ username: string }> {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new Error('Token cannot be empty');
  }

  const octokit = new Octokit({ auth: trimmed });
  const { data: user } = await octokit.rest.users.getAuthenticated();

  const store: TokenStore = {
    token: trimmed,
    username: user.login,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  console.log(`[GitHub Token] Saved dashboard token for @${user.login}`);
  return { username: user.login };
}

export function clearGithubToken(): void {
  if (fs.existsSync(STORE_PATH)) {
    fs.unlinkSync(STORE_PATH);
    console.log('[GitHub Token] Dashboard token removed, falling back to .env if set');
  }
}

export async function getGithubTokenStatusAsync(): Promise<GithubTokenStatus> {
  const status = getGithubTokenStatus();
  const token = getGithubToken();

  if (token && !status.username) {
    try {
      const octokit = new Octokit({ auth: token });
      const { data: user } = await octokit.rest.users.getAuthenticated();
      status.username = user.login;
    } catch {
      status.configured = false;
      status.source = null;
    }
  }

  return status;
}
