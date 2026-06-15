'use strict';

/**
 * modules/healthChecker.ts — Platform Health Monitor
 */

import { Octokit } from '@octokit/rest';

export interface HealthStatus {
  agentService: 'green' | 'yellow' | 'red' | 'grey';
  github: 'green' | 'yellow' | 'red' | 'grey';
  githubUser: string | null;
  claude: 'green' | 'yellow' | 'red' | 'grey';
  modelName: string | null;
  timestamp: string;
}

export async function checkHealth(): Promise<HealthStatus> {
  const status: HealthStatus = {
    agentService: 'green',
    github: 'grey',
    githubUser: null,
    claude: 'grey',
    modelName: null,
    timestamp: new Date().toISOString()
  };

  // 1. Check GitHub
  if (process.env.GITHUB_TOKEN) {
    try {
      const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
      const { data: user } = await octokit.rest.users.getAuthenticated();
      status.github = 'green';
      status.githubUser = user.login;
    } catch (e) {
      status.github = 'red';
    }
  } else {
    status.github = 'yellow'; // Missing token
  }

  // 2. Check Gemini / Claude
  if (process.env.GEMINI_API_KEY) {
    status.claude = 'green';
    status.modelName = 'Gemini 2.5 Flash';
  } else if (process.env.ANTHROPIC_API_KEY) {
    status.claude = 'green';
    status.modelName = 'Claude 3.7 Sonnet';
  } else {
    status.claude = 'yellow';
  }

  return status;
}
