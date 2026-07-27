'use strict';

/**
 * modules/repoHeartbeat.ts — GitHub repo health checks per onboarded product
 */

import { Octokit } from '@octokit/rest';
import { getGithubToken } from './githubTokenStore';

export type HeartbeatStatus = 'green' | 'yellow' | 'red';

export interface ProductHeartbeat {
  productId: string;
  productName: string;
  owner: string;
  repo: string;
  status: HeartbeatStatus;
  reachable: boolean;
  defaultBranch: string | null;
  lastCommit: {
    sha: string;
    message: string;
    author: string;
    date: string;
    daysAgo: number;
  } | null;
  openPrCount: number;
  stalePrCount: number;
  ci: {
    available: boolean;
    conclusion: string | null;
    runAt: string | null;
  };
  issues: string[];
  recommendations: string[];
  openPrs: Array<{
    number: number;
    title: string;
    author: string;
    daysOpen: number;
  }>;
  commitsLast7Days: number;
}

const STALE_COMMIT_DAYS = 7;
const STALE_PR_DAYS = 7;

type ProductCheck = Omit<ProductHeartbeat, 'status' | 'recommendations'>;

function daysSince(isoDate: string): number {
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function deriveStatus(check: ProductCheck): HeartbeatStatus {
  if (!check.reachable) return 'red';
  if (check.issues.some(i => i.includes('CI failed') || i.includes('failed'))) return 'yellow';
  if (check.lastCommit && check.lastCommit.daysAgo > STALE_COMMIT_DAYS) return 'yellow';
  if (check.stalePrCount > 0) return 'yellow';
  return 'green';
}

function buildRecommendations(check: ProductCheck): string[] {
  const recs: string[] = [];
  if (!check.reachable) {
    recs.push('Verify the GitHub token has read access to this repository, or invite the token owner as a collaborator.');
  }
  if (check.lastCommit && check.lastCommit.daysAgo > STALE_COMMIT_DAYS) {
    recs.push(`Review development activity — no commits on ${check.defaultBranch} for ${check.lastCommit.daysAgo} days. Confirm if work is paused or blocked.`);
  }
  if (check.stalePrCount > 0) {
    recs.push(`Review ${check.stalePrCount} stale open PR(s) — merge, close, or request updates from authors.`);
  }
  if (check.ci.available && check.ci.conclusion === 'failure') {
    recs.push('Investigate the latest failed CI run on GitHub Actions and fix before merging new work.');
  }
  if (!check.ci.available && check.reachable) {
    recs.push('Consider adding GitHub Actions CI so heartbeat can monitor build health automatically.');
  }
  if (check.openPrCount > 3) {
    recs.push(`${check.openPrCount} open PRs may indicate a review bottleneck — schedule a PR review session.`);
  }
  if (recs.length === 0 && check.reachable) {
    recs.push('No immediate action required. Continue normal development and monitoring.');
  }
  return recs;
}

function emptyCheck(product: { id: string; name: string; owner: string; repo: string }): ProductCheck {
  return {
    productId: product.id,
    productName: product.name,
    owner: product.owner,
    repo: product.repo,
    reachable: false,
    defaultBranch: null,
    lastCommit: null,
    openPrCount: 0,
    stalePrCount: 0,
    ci: { available: false, conclusion: null, runAt: null },
    issues: [],
    openPrs: [],
    commitsLast7Days: 0
  };
}

export async function checkProductRepo(product: {
  id: string;
  name: string;
  owner?: string;
  repo: string;
}): Promise<ProductHeartbeat> {
  const owner = product.owner || process.env.GITHUB_ORG || '';
  const githubToken = getGithubToken();
  const base = emptyCheck({ ...product, owner });

  if (!githubToken) {
    base.issues.push('GitHub token is not configured — add one on the Repositories tab');
    return { ...base, recommendations: buildRecommendations(base), status: 'red' };
  }

  if (!owner) {
    base.issues.push('GitHub owner/org is not configured');
    return { ...base, recommendations: buildRecommendations(base), status: 'red' };
  }

  const octokit = new Octokit({ auth: githubToken });

  try {
    const { data: repoInfo } = await octokit.rest.repos.get({ owner, repo: product.repo });
    base.reachable = true;
    base.defaultBranch = repoInfo.default_branch;

    const branch = repoInfo.default_branch || 'main';

    try {
      const { data: commits } = await octokit.rest.repos.listCommits({
        owner,
        repo: product.repo,
        sha: branch,
        per_page: 30
      });

      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      base.commitsLast7Days = commits.filter(c => {
        const d = c.commit.author?.date || c.commit.committer?.date;
        return d && new Date(d).getTime() >= weekAgo;
      }).length;

      if (commits.length > 0) {
        const c = commits[0];
        const date = c.commit.author?.date || c.commit.committer?.date || new Date().toISOString();
        const daysAgo = daysSince(date);
        base.lastCommit = {
          sha: c.sha.substring(0, 7),
          message: (c.commit.message || '').split('\n')[0],
          author: c.author?.login || c.commit.author?.name || 'unknown',
          date: date.split('T')[0],
          daysAgo
        };
        if (daysAgo > STALE_COMMIT_DAYS) {
          base.issues.push(`No commits on ${branch} in ${daysAgo} days`);
        }
      } else {
        base.issues.push(`No commits found on ${branch}`);
      }
    } catch {
      base.issues.push(`Could not read commits on ${branch}`);
    }

    try {
      const { data: openPrs } = await octokit.rest.pulls.list({
        owner,
        repo: product.repo,
        state: 'open',
        per_page: 100
      });
      base.openPrCount = openPrs.length;
      base.openPrs = openPrs.slice(0, 5).map(pr => ({
        number: pr.number,
        title: pr.title,
        author: pr.user?.login || 'unknown',
        daysOpen: pr.created_at ? daysSince(pr.created_at) : 0
      }));
      base.stalePrCount = openPrs.filter(pr => {
        if (!pr.created_at) return false;
        return daysSince(pr.created_at) > STALE_PR_DAYS;
      }).length;
      if (base.stalePrCount > 0) {
        base.issues.push(`${base.stalePrCount} open PR(s) older than ${STALE_PR_DAYS} days`);
      }
    } catch {
      base.issues.push('Could not fetch open pull requests');
    }

    try {
      const { data: runs } = await octokit.rest.actions.listWorkflowRunsForRepo({
        owner,
        repo: product.repo,
        per_page: 1
      });
      if (runs.total_count > 0 && runs.workflow_runs.length > 0) {
        const run = runs.workflow_runs[0];
        base.ci.available = true;
        base.ci.conclusion = run.conclusion;
        base.ci.runAt = run.updated_at || run.created_at || null;
        if (run.conclusion === 'failure') {
          base.issues.push('Latest CI workflow run failed');
        }
      }
    } catch {
      // No Actions configured
    }
  } catch (e: any) {
    base.reachable = false;
    const msg = e.message || 'Unknown error';
    if (msg.includes('Not Found') || e.status === 404) {
      base.issues.push('Repository not found or token lacks access');
    } else {
      base.issues.push(`GitHub API error: ${msg}`);
    }
  }

  const recommendations = buildRecommendations(base);
  return { ...base, recommendations, status: deriveStatus(base) };
}

export async function checkAllProductRepos(products: Array<{
  id: string;
  name: string;
  owner?: string;
  repo: string;
}>): Promise<ProductHeartbeat[]> {
  return Promise.all(products.map(checkProductRepo));
}
