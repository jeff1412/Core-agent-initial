'use strict';

/**
 * modules/heartbeatReporter.ts — AI narrative report from repo heartbeat snapshots
 */

import { generateText } from './claudeClient';
import { ProductHeartbeat } from './repoHeartbeat';

const SYSTEM_PROMPT = `You are the ASC Agent operations reporter. You write concise, professional repo health summaries for software product owners.

Rules:
- Use only the facts provided in the JSON snapshot. Do not invent data.
- Write 2-4 short paragraphs covering each product by name.
- Call out green/yellow/red status, last commit activity, open PRs, and CI when relevant.
- If a product is red, explain the likely cause and one actionable next step.
- Use plain language. No markdown headers or bullet lists unless listing specific PR counts.
- Keep the full report under 300 words.`;

export async function generateHeartbeatReport(products: ProductHeartbeat[]): Promise<string> {
  const snapshot = JSON.stringify(products, null, 2);
  const userPrompt = `Write a repo heartbeat report for ASC Creative based on this snapshot:\n\n${snapshot}`;

  return generateText(SYSTEM_PROMPT, userPrompt, 0.4);
}

export function fallbackReport(products: ProductHeartbeat[]): string {
  return products.map(p => {
    const commit = p.lastCommit
      ? `Last commit ${p.lastCommit.daysAgo === 0 ? 'today' : `${p.lastCommit.daysAgo} day(s) ago`} on ${p.defaultBranch}`
      : 'No recent commits';
    const ci = p.ci.available
      ? `CI: ${p.ci.conclusion || 'pending'}`
      : 'CI: not configured';
    const issues = p.issues.length ? ` Issues: ${p.issues.join('; ')}.` : '';
    return `${p.productName} (${p.status.toUpperCase()}): ${commit}. Open PRs: ${p.openPrCount}. ${ci}.${issues}`;
  }).join('\n\n');
}
