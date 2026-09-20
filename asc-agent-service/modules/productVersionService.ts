'use strict';

/**
 * MeetingGenius-aligned monthly version changelog from GitHub (deploy branch).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Octokit } from '@octokit/rest';
import { getGithubToken } from './githubTokenStore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_COMMITS = 300;
const CACHE_TTL_MS = 5 * 60 * 1000;

export type CommitType =
  | 'feat'
  | 'fix'
  | 'update'
  | 'perf'
  | 'refactor'
  | 'chore'
  | 'docs'
  | 'other';

export interface VersionCommit {
  hash: string;
  fullHash: string;
  message: string;
  description: string;
  date: string;
  author: string;
  authorEmail?: string;
  type: CommitType;
  scope?: string;
}

export interface MonthlyVersionGroup {
  monthKey: string;
  monthLabel: string;
  version: string;
  title: string;
  date: string;
  description: string;
  stats: {
    total: number;
    feats: number;
    fixes: number;
    updates: number;
  };
  changes: VersionCommit[];
}

export interface ProductChangelogPayload {
  productId: string;
  productName: string;
  deployBranch: string;
  repo: string;
  owner: string;
  totalCommits: number;
  totalFeatures: number;
  totalFixes: number;
  availableMonths: Array<{ key: string; label: string; count: number; version: string }>;
  versions: MonthlyVersionGroup[];
}

export interface ProductVersionConfig {
  enabled: boolean;
  comingSoon?: boolean;
  deployBranch?: string;
  metadataFile?: string;
}

export interface OnboardedProduct {
  id: string;
  name: string;
  owner?: string;
  repo: string;
  versionChangelog?: ProductVersionConfig;
}

interface ChangelogCacheEntry {
  fetchedAt: number;
  payload: ProductChangelogPayload;
}

const changelogCache = new Map<string, ChangelogCacheEntry>();

function loadProducts(): OnboardedProduct[] {
  const productsPath = path.join(__dirname, '..', 'products.json');
  return JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
}

export function getVersionCapableProducts(): Array<{
  id: string;
  name: string;
  enabled: boolean;
  comingSoon: boolean;
}> {
  return loadProducts().map(p => ({
    id: p.id,
    name: p.name,
    enabled: Boolean(p.versionChangelog?.enabled),
    comingSoon: Boolean(p.versionChangelog?.comingSoon)
  }));
}

function loadMonthMetadata(metadataFile: string): Record<string, { version: string; title: string; description: string }> {
  const metaPath = path.join(__dirname, '..', 'version-metadata', metadataFile);
  if (!fs.existsSync(metaPath)) return {};
  return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
}

function determineCommitType(message: string): CommitType {
  const lower = message.toLowerCase();
  if (lower.startsWith('feat') || lower.includes('feature')) return 'feat';
  if (lower.startsWith('fix') || lower.includes('bugfix') || lower.includes('hotfix') || lower.startsWith('fix:')) return 'fix';
  if (lower.startsWith('perf') || lower.includes('optimization') || lower.includes('performance')) return 'perf';
  if (lower.startsWith('refactor') || lower.includes('cleanup')) return 'refactor';
  if (lower.startsWith('docs') || lower.includes('documentation') || lower.includes('readme')) return 'docs';
  if (lower.startsWith('update') || lower.startsWith('chore') || lower.includes('config')) return 'update';
  return 'other';
}

function generateCommitDescription(message: string, type: CommitType, scope?: string): string {
  const cleaned = message.replace(/^[a-z]+(?:\([^)]+\))?:\s*/i, '').trim();
  const sentence = cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : message;
  const typeLabel =
    type === 'feat'
      ? 'Feature Implementation'
      : type === 'fix'
        ? 'Bug Fix & Resolution'
        : type === 'perf'
          ? 'Performance Optimization'
          : type === 'refactor'
            ? 'Code Refactoring'
            : type === 'docs'
              ? 'Documentation'
              : 'System Update';
  const scopeSuffix = scope ? ` within the ${scope} module` : '';
  return `${sentence}. (${typeLabel}${scopeSuffix})`;
}

function parseGithubCommit(sha: string, fullMessage: string, date: string, author: string, authorEmail: string): VersionCommit | null {
  const lines = fullMessage.split('\n');
  const subject = (lines[0] || '').trim();
  if (!subject) return null;

  const rawBody = lines.slice(1).join('\n').trim();
  const scopeMatch = subject.match(/^[a-z]+(?:\(([^)]+)\))?:/i);
  const scope = scopeMatch?.[1] || undefined;
  const type = determineCommitType(subject);
  const description = rawBody || generateCommitDescription(subject, type, scope);

  return {
    hash: sha.slice(0, 7),
    fullHash: sha,
    message: subject,
    description,
    date: date.slice(0, 10),
    author,
    authorEmail,
    type,
    scope
  };
}

async function fetchCommitsFromGithub(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string
): Promise<VersionCommit[]> {
  const commits: VersionCommit[] = [];
  let page = 1;

  while (commits.length < MAX_COMMITS) {
    const { data } = await octokit.repos.listCommits({
      owner,
      repo,
      sha: branch,
      per_page: 100,
      page
    });
    if (data.length === 0) break;

    for (const item of data) {
      if (commits.length >= MAX_COMMITS) break;
      const c = item.commit;
      const parsed = parseGithubCommit(
        item.sha,
        c.message,
        c.author?.date || c.committer?.date || '',
        c.author?.name || 'Unknown',
        c.author?.email || ''
      );
      if (parsed) commits.push(parsed);
    }

    if (data.length < 100) break;
    page += 1;
  }

  return commits;
}

function groupCommitsByMonth(
  commits: VersionCommit[],
  monthMetadata: Record<string, { version: string; title: string; description: string }>
): MonthlyVersionGroup[] {
  const monthGroupsMap = new Map<string, VersionCommit[]>();

  commits.forEach(c => {
    let monthKey = '2026-06';
    if (c.date && c.date.length >= 7) {
      monthKey = c.date.substring(0, 7);
    }
    if (!monthGroupsMap.has(monthKey)) monthGroupsMap.set(monthKey, []);
    monthGroupsMap.get(monthKey)!.push(c);
  });

  const sortedMonthKeys = Array.from(monthGroupsMap.keys()).sort().reverse();
  let autoVersionMinor = sortedMonthKeys.length - 1;

  return sortedMonthKeys.map((monthKey, idx) => {
    const changes = monthGroupsMap.get(monthKey) || [];

    let monthLabel = monthKey;
    try {
      const [y, m] = monthKey.split('-');
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      monthLabel = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      monthLabel = monthKey;
    }

    const feats = changes.filter(c => c.type === 'feat').length;
    const fixes = changes.filter(c => c.type === 'fix').length;
    const updates = changes.filter(c => c.type !== 'feat' && c.type !== 'fix').length;

    const meta = monthMetadata[monthKey];
    const version = meta?.version || `v1.${Math.max(0, autoVersionMinor - idx)}.0`;
    const title = meta?.title || `${monthLabel} System Updates & Enhancements`;
    const description =
      meta?.description ||
      `Delivered ${changes.length} repository changes including ${feats} new features and ${fixes} stability bugfixes.`;

    return {
      monthKey,
      monthLabel,
      version,
      title,
      date: monthLabel,
      description,
      stats: { total: changes.length, feats, fixes, updates },
      changes
    };
  });
}

function resolveProduct(productId: string): OnboardedProduct {
  const product = loadProducts().find(p => p.id === productId);
  if (!product) throw new Error(`Unknown product: ${productId}`);
  if (!product.versionChangelog?.enabled) {
    if (product.versionChangelog?.comingSoon) {
      throw new Error(`${product.name} version insights are coming soon.`);
    }
    throw new Error(`Version changelog is not enabled for ${product.name}.`);
  }
  return product;
}

export async function getProductChangelog(productId: string, bypassCache = false): Promise<ProductChangelogPayload> {
  const product = resolveProduct(productId);
  const cfg = product.versionChangelog!;
  const deployBranch = cfg.deployBranch || 'main';
  const metadataFile = cfg.metadataFile || `${productId}.json`;

  if (!bypassCache) {
    const cached = changelogCache.get(productId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.payload;
    }
  }

  const token = getGithubToken();
  const owner = product.owner || process.env.GITHUB_ORG || '';
  if (!token) throw new Error('GitHub token is not configured');
  if (!owner) throw new Error('GitHub owner is not configured');

  const octokit = new Octokit({ auth: token });
  const commits = await fetchCommitsFromGithub(octokit, owner, product.repo, deployBranch);
  const monthMetadata = loadMonthMetadata(metadataFile);
  const versions = groupCommitsByMonth(commits, monthMetadata);

  const payload: ProductChangelogPayload = {
    productId: product.id,
    productName: product.name,
    deployBranch,
    repo: product.repo,
    owner,
    totalCommits: commits.length,
    totalFeatures: commits.filter(c => c.type === 'feat').length,
    totalFixes: commits.filter(c => c.type === 'fix').length,
    availableMonths: versions.map(v => ({
      key: v.monthKey,
      label: v.monthLabel,
      count: v.stats.total,
      version: v.version
    })),
    versions
  };

  changelogCache.set(productId, { fetchedAt: Date.now(), payload });
  return payload;
}

export function findVersionGroup(
  changelog: ProductChangelogPayload,
  selector: { monthKey?: string; version?: string }
): MonthlyVersionGroup | null {
  if (selector.monthKey) {
    return changelog.versions.find(v => v.monthKey === selector.monthKey) || null;
  }
  if (selector.version) {
    const raw = selector.version.trim().toLowerCase();
    const withV = raw.startsWith('v') ? raw : `v${raw}`;
    return changelog.versions.find(v => v.version.toLowerCase() === withV) || null;
  }
  return null;
}

/** Last N monthly release cycles for code audit context */
export async function getRecentVersionSummaries(
  productId: string,
  cycles = 2
): Promise<Array<Pick<MonthlyVersionGroup, 'monthKey' | 'version' | 'title' | 'description' | 'stats' | 'changes'>>> {
  const changelog = await getProductChangelog(productId);
  return changelog.versions.slice(0, cycles).map(v => ({
    monthKey: v.monthKey,
    version: v.version,
    title: v.title,
    description: v.description,
    stats: v.stats,
    changes: v.changes.map(c => ({
      ...c,
      description: c.description.length > 280 ? c.description.slice(0, 277) + '...' : c.description
    }))
  }));
}

export async function buildAuditVersionContext(
  products: OnboardedProduct[],
  cycles = 2
): Promise<Record<string, unknown>> {
  const context: Record<string, unknown> = {};

  for (const product of products) {
    if (!product.versionChangelog?.enabled) continue;
    try {
      const summaries = await getRecentVersionSummaries(product.id, cycles);
      context[product.id] = {
        productName: product.name,
        deployBranch: product.versionChangelog.deployBranch || 'main',
        releaseCyclesIncluded: cycles,
        versions: summaries.map(s => ({
          version: s.version,
          monthKey: s.monthKey,
          title: s.title,
          description: s.description,
          stats: s.stats,
          featureHighlights: s.changes.filter(c => c.type === 'feat').slice(0, 25).map(c => ({
            scope: c.scope,
            message: c.message,
            hash: c.hash
          })),
          fixHighlights: s.changes.filter(c => c.type === 'fix').slice(0, 15).map(c => ({
            scope: c.scope,
            message: c.message,
            hash: c.hash
          }))
        }))
      };
    } catch (e: any) {
      context[product.id] = { error: e.message };
    }
  }

  return context;
}
