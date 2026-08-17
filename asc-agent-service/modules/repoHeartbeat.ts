'use strict';

/**
 * modules/repoHeartbeat.ts — GitHub repo health checks per onboarded product
 */

import { Octokit } from '@octokit/rest';
import { getGithubToken } from './githubTokenStore';

export type HeartbeatStatus = 'green' | 'yellow' | 'red';
export type IssueCategory = 'branch' | 'pull_request' | 'ci' | 'access';

export interface HeartbeatIssue {
  category: IssueCategory;
  message: string;
}

export interface BranchActivity {
  name: string;
  lastCommitDate: string;
  daysAgo: number;
  sha: string;
  author: string;
}

export interface ProductHeartbeat {
  productId: string;
  productName: string;
  owner: string;
  repo: string;
  status: HeartbeatStatus;
  reachable: boolean;
  defaultBranch: string | null;
  branchesChecked: number;
  branchActivity: BranchActivity[];
  staleBranches: BranchActivity[];
  lastCommit: {
    sha: string;
    message: string;
    author: string;
    date: string;
    daysAgo: number;
    branch: string;
  } | null;
  openPrCount: number;
  stalePrCount: number;
  ci: {
    available: boolean;
    conclusion: string | null;
    runAt: string | null;
  };
  issues: HeartbeatIssue[];
  recommendations: string[];
  openPrs: Array<{
    number: number;
    title: string;
    author: string;
    daysOpen: number;
    daysSinceUpdate: number;
  }>;
  commitsLast7Days: number;
}

const STALE_COMMIT_DAYS = 7;
const STALE_PR_DAYS = 7;
const MAX_BRANCHES = 30;

type ProductCheck = Omit<ProductHeartbeat, 'status' | 'recommendations'>;

function daysSince(isoDate: string): number {
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function deriveStatus(check: ProductCheck): HeartbeatStatus {
  if (!check.reachable) return 'red';
  if (check.issues.some(i => i.category === 'ci' && i.message.includes('failed'))) return 'yellow';
  if (check.issues.some(i => i.category === 'branch')) return 'yellow';
  if (check.stalePrCount > 0) return 'yellow';
  return 'green';
}

function buildRecommendations(check: ProductCheck): string[] {
  const recs: string[] = [];
  if (!check.reachable) {
    recs.push('Verify the GitHub token has read access to this repository, or invite the token owner as a collaborator.');
  }
  const branchIssue = check.issues.find(i => i.category === 'branch');
  if (branchIssue) {
    recs.push(`Branch activity: ${branchIssue.message}`);
  }
  if (check.staleBranches.length > 0) {
    recs.push(`Review ${check.staleBranches.length} stale branch(es) with no commits in ${STALE_COMMIT_DAYS}+ days — merge or delete if obsolete.`);
  }
  if (check.stalePrCount > 0) {
    recs.push(`Review ${check.stalePrCount} stale open PR(s) with no updates in ${STALE_PR_DAYS}+ days — merge, close, or request changes.`);
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
    branchesChecked: 0,
    branchActivity: [],
    staleBranches: [],
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
    base.issues.push({ category: 'access', message: 'GitHub token is not configured — add one on the Repositories tab' });
    return { ...base, recommendations: buildRecommendations(base), status: 'red' };
  }

  if (!owner) {
    base.issues.push({ category: 'access', message: 'GitHub owner/org is not configured' });
    return { ...base, recommendations: buildRecommendations(base), status: 'red' };
  }

  const octokit = new Octokit({ auth: githubToken });

  try {
    const { data: repoInfo } = await octokit.rest.repos.get({ owner, repo: product.repo });
    base.reachable = true;
    const defaultBranch = repoInfo.default_branch || 'main';
    base.defaultBranch = defaultBranch;

    try {
      let branchesToCheck: string[] = [defaultBranch];
      try {
        const { data: branchList } = await octokit.rest.repos.listBranches({
          owner,
          repo: product.repo,
          per_page: MAX_BRANCHES
        });
        branchesToCheck = [...new Set([defaultBranch, ...branchList.map(b => b.name)])];
      } catch {
        branchesToCheck = [...new Set([defaultBranch, 'main', 'master', 'develop', 'development', 'dev', 'staging'].filter(Boolean))];
      }

      base.branchesChecked = branchesToCheck.length;
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const seenShas = new Set<string>();
      const branchActivities: BranchActivity[] = [];
      let latest: ProductCheck['lastCommit'] = null;

      for (const branchName of branchesToCheck) {
        try {
          const { data: commits } = await octokit.rest.repos.listCommits({
            owner,
            repo: product.repo,
            sha: branchName,
            per_page: 5
          });

          if (commits.length === 0) continue;

          const c = commits[0];
          const date = c.commit.author?.date || c.commit.committer?.date || new Date().toISOString();
          const daysAgo = daysSince(date);
          const activity: BranchActivity = {
            name: branchName,
            lastCommitDate: date.split('T')[0],
            daysAgo,
            sha: c.sha.substring(0, 7),
            author: c.author?.login || c.commit.author?.name || 'unknown'
          };
          branchActivities.push(activity);

          for (const commit of commits) {
            if (seenShas.has(commit.sha)) continue;
            seenShas.add(commit.sha);
            const d = commit.commit.author?.date || commit.commit.committer?.date;
            if (d && new Date(d).getTime() >= weekAgo) {
              base.commitsLast7Days += 1;
            }
          }

          if (!latest || new Date(date) > new Date(latest.date)) {
            latest = {
              sha: c.sha.substring(0, 7),
              message: (c.commit.message || '').split('\n')[0],
              author: activity.author,
              date,
              daysAgo,
              branch: branchName
            };
          }
        } catch {
          // Branch may not exist or no access — skip
        }
      }

      branchActivities.sort((a, b) => a.daysAgo - b.daysAgo);
      base.branchActivity = branchActivities.filter(b => b.daysAgo <= STALE_COMMIT_DAYS);
      base.staleBranches = branchActivities.filter(b => b.daysAgo > STALE_COMMIT_DAYS);

      if (latest) {
        base.lastCommit = {
          sha: latest.sha,
          message: latest.message,
          author: latest.author,
          date: latest.date.split('T')[0],
          daysAgo: latest.daysAgo,
          branch: latest.branch
        };
      }

      const hasRecentActivity = base.commitsLast7Days > 0 || (latest && latest.daysAgo <= STALE_COMMIT_DAYS);

      if (!latest) {
        base.issues.push({ category: 'branch', message: 'No commits found on any tracked branch' });
      } else if (!hasRecentActivity) {
        base.issues.push({
          category: 'branch',
          message: `No commits on any of ${base.branchesChecked} tracked branch(es) in ${STALE_COMMIT_DAYS}+ days (latest: ${latest.branch}, ${latest.daysAgo}d ago)`
        });
      } else if (base.staleBranches.length > 0 && base.branchActivity.length > 0) {
        const staleNames = base.staleBranches.slice(0, 3).map(b => b.name).join(', ');
        const suffix = base.staleBranches.length > 3 ? ` +${base.staleBranches.length - 3} more` : '';
        base.issues.push({
          category: 'branch',
          message: `${base.staleBranches.length} branch(es) with no recent activity (${staleNames}${suffix}) — active on ${latest.branch}`
        });
      }
    } catch {
      base.issues.push({ category: 'branch', message: 'Could not read commits across repository branches' });
    }

    try {
      const { data: openPrs } = await octokit.rest.pulls.list({
        owner,
        repo: product.repo,
        state: 'open',
        per_page: 100
      });
      base.openPrCount = openPrs.length;
      base.openPrs = openPrs.slice(0, 5).map(pr => {
        const created = pr.created_at ? daysSince(pr.created_at) : 0;
        const updated = pr.updated_at ? daysSince(pr.updated_at) : created;
        return {
          number: pr.number,
          title: pr.title,
          author: pr.user?.login || 'unknown',
          daysOpen: created,
          daysSinceUpdate: updated
        };
      });
      base.stalePrCount = openPrs.filter(pr => {
        const activity = pr.updated_at || pr.created_at;
        if (!activity) return false;
        return daysSince(activity) > STALE_PR_DAYS;
      }).length;
      if (base.stalePrCount > 0) {
        base.issues.push({
          category: 'pull_request',
          message: `${base.stalePrCount} open PR(s) with no activity in ${STALE_PR_DAYS}+ days`
        });
      }
    } catch {
      base.issues.push({ category: 'pull_request', message: 'Could not fetch open pull requests' });
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
          base.issues.push({ category: 'ci', message: 'Latest CI workflow run failed' });
        }
      }
    } catch {
      // No Actions configured
    }
  } catch (e: any) {
    base.reachable = false;
    const msg = e.message || 'Unknown error';
    if (msg.includes('Not Found') || e.status === 404) {
      base.issues.push({ category: 'access', message: 'Repository not found or token lacks access' });
    } else {
      base.issues.push({ category: 'access', message: `GitHub API error: ${msg}` });
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

/** Normalize legacy string issues from old reports. */
export function normalizeIssue(issue: HeartbeatIssue | string): HeartbeatIssue {
  if (typeof issue === 'object' && issue.category) return issue;
  const msg = String(issue);
  if (msg.includes('PR') || msg.includes('pull request')) return { category: 'pull_request', message: msg };
  if (msg.includes('CI') || msg.includes('workflow')) return { category: 'ci', message: msg };
  if (msg.includes('token') || msg.includes('access') || msg.includes('not found')) return { category: 'access', message: msg };
  return { category: 'branch', message: msg };
}
