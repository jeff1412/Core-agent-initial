'use strict';

/**
 * modules/healthChecker.ts — Platform Health Monitor
 */

import { Octokit } from '@octokit/rest';
import { getGithubToken } from './githubTokenStore';
import { getActiveLlmConfig } from './llmConfigStore';

export interface HealthStatus {
  agentService: 'green' | 'yellow' | 'red' | 'grey';
  github: 'green' | 'yellow' | 'red' | 'grey';
  githubUser: string | null;
  claude: 'green' | 'yellow' | 'red' | 'grey';
  modelName: string | null;
  llmProvider: string | null;
  timestamp: string;
}

export async function checkHealth(): Promise<HealthStatus> {
  const status: HealthStatus = {
    agentService: 'green',
    github: 'grey',
    githubUser: null,
    claude: 'grey',
    modelName: null,
    llmProvider: null,
    timestamp: new Date().toISOString()
  };

  // 1. Check GitHub
  const githubToken = getGithubToken();
  if (githubToken) {
    try {
      const octokit = new Octokit({ auth: githubToken });
      const { data: user } = await octokit.rest.users.getAuthenticated();
      status.github = 'green';
      status.githubUser = user.login;
    } catch (e) {
      status.github = 'red';
    }
  } else {
    status.github = 'yellow'; // Missing token
  }

  const { provider, apiKey, model } = getActiveLlmConfig();
  if (apiKey) {
    status.claude = 'green';
    status.llmProvider = provider;
    const labels: Record<string, string> = {
      gemini: 'Gemini',
      openai: 'GPT',
      anthropic: 'Claude'
    };
    status.modelName = `${labels[provider] || provider} · ${model}`;
  } else {
    status.claude = 'yellow';
  }

  return status;
}
