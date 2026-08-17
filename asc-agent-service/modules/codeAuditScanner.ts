'use strict';

/**
 * modules/codeAuditScanner.ts — Fetch source files from GitHub for code review
 */

import { Octokit } from '@octokit/rest';
import { getGithubToken } from './githubTokenStore';

export interface CodeFileSnapshot {
  path: string;
  size: number;
  language: string | null;
  excerpt: string;
}

export interface ProductCodeSnapshot {
  productId: string;
  productName: string;
  owner: string;
  repo: string;
  defaultBranch: string;
  reachable: boolean;
  filesScanned: number;
  files: CodeFileSnapshot[];
  error: string | null;
}

const MAX_FILES = 18;
const MAX_FILE_CHARS = 6000;
const MAX_TOTAL_CHARS = 48000;

const PRIORITY_PATHS = [
  'AGENT.md',
  'README.md',
  'package.json',
  'tsconfig.json',
  'server.ts',
  'server.js',
  'src/App.tsx',
  'src/main.tsx',
  'src/index.ts',
  'src/index.js'
];

const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.cs', '.php', '.rb', '.vue', '.sql'
]);

function guessLanguage(path: string): string | null {
  if (path.endsWith('.tsx')) return 'TypeScript React';
  if (path.endsWith('.ts')) return 'TypeScript';
  if (path.endsWith('.jsx')) return 'JavaScript React';
  if (path.endsWith('.js')) return 'JavaScript';
  if (path.endsWith('.py')) return 'Python';
  if (path.endsWith('.go')) return 'Go';
  if (path.endsWith('.json')) return 'JSON';
  if (path.endsWith('.md')) return 'Markdown';
  return null;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '\n\n... [truncated]';
}

async function fetchFileContent(
  octokit: Octokit, owner: string, repo: string, filePath: string, ref: string
): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: filePath, ref });
    if (Array.isArray(data) || data.type !== 'file' || !('content' in data)) return null;
    return Buffer.from(data.content, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

async function discoverPaths(
  octokit: Octokit, owner: string, repo: string, ref: string
): Promise<string[]> {
  const paths = new Set<string>(PRIORITY_PATHS);

  try {
    const { data: commits } = await octokit.repos.listCommits({ owner, repo, sha: ref, per_page: 8 });
    for (const commit of commits) {
      try {
        const { data: detail } = await octokit.repos.getCommit({ owner, repo, ref: commit.sha });
        for (const f of detail.files || []) {
          if (!f.filename || f.status === 'removed') continue;
          const ext = f.filename.slice(f.filename.lastIndexOf('.'));
          if (CODE_EXTENSIONS.has(ext) || f.filename.endsWith('.json') || f.filename.endsWith('.md')) {
            paths.add(f.filename);
          }
        }
      } catch {
        // skip commit detail
      }
    }
  } catch {
    // skip recent commits
  }

  try {
    const { data: tree } = await octokit.git.getTree({ owner, repo, tree_sha: ref, recursive: '1' });
    for (const item of tree.tree || []) {
      if (item.type !== 'blob' || !item.path) continue;
      if (item.path.includes('node_modules/') || item.path.includes('dist/') || item.path.includes('.min.')) continue;
      const ext = item.path.slice(item.path.lastIndexOf('.'));
      if (CODE_EXTENSIONS.has(ext) && item.path.includes('src/')) {
        paths.add(item.path);
      }
    }
  } catch {
    // tree may fail on large repos
  }

  return [...paths];
}

export async function scanProductCode(product: {
  id: string;
  name: string;
  owner?: string;
  repo: string;
}): Promise<ProductCodeSnapshot> {
  const owner = product.owner || process.env.GITHUB_ORG || '';
  const token = getGithubToken();
  const empty: ProductCodeSnapshot = {
    productId: product.id,
    productName: product.name,
    owner,
    repo: product.repo,
    defaultBranch: 'main',
    reachable: false,
    filesScanned: 0,
    files: [],
    error: null
  };

  if (!token) {
    empty.error = 'GitHub token not configured';
    return empty;
  }
  if (!owner) {
    empty.error = 'GitHub owner not configured';
    return empty;
  }

  const octokit = new Octokit({ auth: token });

  try {
    const { data: repoInfo } = await octokit.repos.get({ owner, repo: product.repo });
    const defaultBranch = repoInfo.default_branch || 'main';
    empty.defaultBranch = defaultBranch;
    empty.reachable = true;

    const candidates = await discoverPaths(octokit, owner, product.repo, defaultBranch);
    const ordered = [
      ...PRIORITY_PATHS.filter(p => candidates.includes(p)),
      ...candidates.filter(p => !PRIORITY_PATHS.includes(p))
    ].slice(0, MAX_FILES);

    let totalChars = 0;
    for (const filePath of ordered) {
      if (totalChars >= MAX_TOTAL_CHARS) break;
      const content = await fetchFileContent(octokit, owner, product.repo, filePath, defaultBranch);
      if (!content) continue;
      const budget = Math.min(MAX_FILE_CHARS, MAX_TOTAL_CHARS - totalChars);
      const excerpt = truncate(content, budget);
      totalChars += excerpt.length;
      empty.files.push({
        path: filePath,
        size: content.length,
        language: guessLanguage(filePath),
        excerpt
      });
    }

    empty.filesScanned = empty.files.length;
    if (empty.filesScanned === 0) {
      empty.error = 'No scannable source files found in repository';
    }
  } catch (e: any) {
    empty.error = e.message || 'Failed to scan repository';
  }

  return empty;
}

export async function scanAllProductCode(products: Array<{
  id: string;
  name: string;
  owner?: string;
  repo: string;
}>): Promise<ProductCodeSnapshot[]> {
  return Promise.all(products.map(scanProductCode));
}
