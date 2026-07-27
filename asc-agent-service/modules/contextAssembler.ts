'use strict';

/**
 * modules/contextAssembler.ts — GitHub Context Assembler
 */

import { Octokit } from '@octokit/rest';
import { getGithubToken } from './githubTokenStore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Fetches a single file from GitHub and returns its decoded content.
 */
async function fetchFile(octokit: Octokit, owner: string, repo: string, path: string): Promise<string | null> {
  try {
    const response = await octokit.repos.getContent({ owner, repo, path });
    // @ts-ignore - getContent response can be complex
    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
    console.log(`  [Context] ✅ Fetched: ${repo}/${path} (${content.length} chars)`);
    return content;
  } catch (error: any) {
    if (error.status === 404) {
      console.warn(`  [Context] ⚠️  Not found: ${repo}/${path} — skipping`);
    } else {
      console.error(`  [Context] ❌ Error fetching ${repo}/${path}: ${error.message}`);
    }
    return null;
  }
}

export interface AssembledContext {
  contextString: string;
  filesFetched: string[];
  repoOwner?: string;
  repoName?: string;
}

/**
 * assembleContext(productName, referenceFiles)
 */
export async function assembleContext(productName: string, referenceFiles: string | string[] = []): Promise<AssembledContext> {
  const githubToken = getGithubToken();
  const githubOrg   = process.env.GITHUB_ORG;

  if (!githubToken) throw new Error('GitHub token is not configured');
  if (!githubOrg)   throw new Error('GITHUB_ORG is not set in .env');

  const octokit = new Octokit({ auth: githubToken });

  // Resolve product repo name and owner
  const normalizedProduct = productName.toLowerCase().replace(/\s+/g, '');
  const productsPath = path.join(__dirname, '..', 'products.json');
  let productRepo = '';
  let repoOwner = githubOrg; // Default to global org
  
  try {
    const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
    const match = products.find((p: any) => 
      p.id === normalizedProduct || 
      p.name.toLowerCase().replace(/\s+/g, '') === normalizedProduct ||
      p.repo.toLowerCase() === normalizedProduct
    );
    if (match) {
      productRepo = match.repo;
      if (match.owner) repoOwner = match.owner;
    }
  } catch (e) {
    console.error('Failed to read products.json in contextAssembler:', e);
  }

  if (!productRepo) {
    throw new Error(`Unknown product: "${productName}". Please onboard it via the Repositories dashboard.`);
  }

  const contextParts: string[] = [];
  const filesFetched: string[] = [];

  // 1. Master AGENT.md
  // Using githubOrg here because the master constitution is usually in the main service org
  const masterAgent = await fetchFile(octokit, githubOrg, 'asc-agent-core', 'AGENT.md');
  if (masterAgent) {
    contextParts.push(`=== MASTER AGENT CONSTITUTION (asc-agent-core/AGENT.md) ===\n${masterAgent}`);
    filesFetched.push('asc-agent-core/AGENT.md');
  }

  // 2. Product AGENT.md
  const productAgent = await fetchFile(octokit, repoOwner, productRepo, 'AGENT.md');
  if (productAgent) {
    contextParts.push(`=== PRODUCT AGENT RULES (${productRepo}/AGENT.md) ===\n${productAgent}`);
    filesFetched.push(`${productRepo}/AGENT.md`);
  }

  // 3. Product CODEBASE.md
  const codebase = await fetchFile(octokit, repoOwner, productRepo, 'CODEBASE.md');
  if (codebase) {
    contextParts.push(`=== CODEBASE REFERENCE (${productRepo}/CODEBASE.md) ===\n${codebase}`);
    filesFetched.push(`${productRepo}/CODEBASE.md`);
  }

  // 4. Reference Files
  const refPaths = Array.isArray(referenceFiles)
    ? referenceFiles
    : referenceFiles.split(',').map(f => f.trim()).filter(Boolean);

  for (const filePath of refPaths) {
    if (!filePath) continue;
    const content = await fetchFile(octokit, repoOwner, productRepo, filePath);
    if (content) {
      contextParts.push(`=== REFERENCE FILE (${productRepo}/${filePath}) ===\n${content}`);
      filesFetched.push(`${productRepo}/${filePath}`);
    }
  }

  const contextString = contextParts.join('\n\n---\n\n');
  return { contextString, filesFetched, repoOwner, repoName: productRepo };
}
