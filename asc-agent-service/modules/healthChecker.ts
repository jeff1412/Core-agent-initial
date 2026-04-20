'use strict';

/**
 * modules/healthChecker.ts — Platform Health Monitor
 */

import { Octokit } from '@octokit/rest';

export interface HealthStatus {
  agentService: 'green' | 'yellow' | 'red' | 'grey';
  github: 'green' | 'yellow' | 'red' | 'grey';
  claude: 'green' | 'yellow' | 'red' | 'grey';
  timestamp: string;
}

export async function checkHealth(): Promise<HealthStatus> {
  const status: HealthStatus = {
    agentService: 'green',
    github: 'grey',
    claude: 'grey',
    timestamp: new Date().toISOString()
  };

  // 1. Check GitHub
  if (process.env.GITHUB_TOKEN) {
    try {
      const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
      await octokit.rest.users.getAuthenticated();
      status.github = 'green';
    } catch (e) {
      status.github = 'red';
    }
  } else {
    status.github = 'yellow'; // Missing token
  }

  // 2. Check Claude
  if (process.env.ANTHROPIC_API_KEY) {
    status.claude = 'green';
  } else {
    status.claude = 'yellow';
  }

  return status;
}
