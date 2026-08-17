'use strict';

/**
 * modules/heartbeatReporter.ts — AI narrative report from repo heartbeat snapshots
 */

import { generateText } from './llmClient';
import { ProductHeartbeat } from './repoHeartbeat';

const SYSTEM_PROMPT = `You are the ASC Agent operations reporter for ASC Creative Ltd. You write detailed, professional repo health reports for product owners and engineering leads.

STRICT RULES:
- Use ONLY facts from the JSON snapshot. Never invent commits, PR numbers, or CI results.
- Write in clear markdown with the EXACT section structure below.
- Be specific: cite repo names, commit ages, PR numbers/titles when provided, CI conclusions.
- Each product section must include concrete issues and actionable recommendations.
- Tone: professional, direct, operations-focused.

REQUIRED OUTPUT FORMAT (use these exact ## and ### headings):

## Executive Summary
2-3 sentences on overall portfolio health across all products. State how many are green/yellow/red.

## Product Reports

### [Product Name] — [GREEN|YELLOW|RED]
**Repository:** owner/repo
**Default branch:** ...
**Activity:** Describe last commit (author, message summary, age), commits in last 7 days.
**Pull Requests:** Open count, stale count, list notable open PRs if any.
**CI/CD:** Status or "not configured".
**Issues Identified:** Bullet list of specific issues from the snapshot (or "None detected").
**Recommendations:** Bullet list of specific next steps for this product.

(Repeat ### section for each product)

## Cross-Portfolio Issues
Bullet list of systemic problems affecting multiple products (token access, inactivity patterns, etc.).

## Priority Recommendations
Numbered list of top 3-5 actions ranked by urgency across all products.`;

export async function generateHeartbeatReport(products: ProductHeartbeat[]): Promise<string> {
  const snapshot = JSON.stringify(products, null, 2);
  const userPrompt = `Generate a detailed repo heartbeat report for ASC Creative. Report date context: ${new Date().toISOString()}.\n\nSnapshot data:\n\n${snapshot}`;

  return generateText(SYSTEM_PROMPT, userPrompt, 0.35, 4096);
}

export function fallbackReport(products: ProductHeartbeat[]): string {
  const counts = { green: 0, yellow: 0, red: 0 };
  products.forEach(p => counts[p.status]++);

  let report = `## Executive Summary\n\n`;
  report += `Portfolio status: ${counts.green} healthy, ${counts.yellow} need attention, ${counts.red} critical.\n\n`;
  report += `## Product Reports\n\n`;

  for (const p of products) {
    report += `### ${p.productName} — ${p.status.toUpperCase()}\n`;
    report += `**Repository:** ${p.owner}/${p.repo}\n`;
    report += `**Default branch:** ${p.defaultBranch || 'unknown'}\n\n`;

    if (p.lastCommit) {
      report += `**Activity:** Last commit ${p.lastCommit.daysAgo} day(s) ago by @${p.lastCommit.author} — "${p.lastCommit.message}" (${p.lastCommit.sha}). ${p.commitsLast7Days} commit(s) in the last 7 days.\n\n`;
    } else {
      report += `**Activity:** No recent commits detected.\n\n`;
    }

    report += `**Pull Requests:** ${p.openPrCount} open (${p.stalePrCount} stale).\n`;
    if (p.openPrs.length > 0) {
      p.openPrs.forEach(pr => {
        report += `- #${pr.number}: ${pr.title} (@${pr.author}, ${pr.daysOpen}d open)\n`;
      });
    }
    report += `\n**CI/CD:** ${p.ci.available ? `Latest run: ${p.ci.conclusion}` : 'Not configured'}\n\n`;

    report += `**Issues Identified:**\n`;
    if (p.issues.length === 0) report += `- None detected\n`;
    else p.issues.forEach(i => { report += `- ${typeof i === 'string' ? i : i.message}\n`; });

    report += `\n**Recommendations:**\n`;
    p.recommendations.forEach(r => { report += `- ${r}\n`; });
    report += `\n`;
  }

  report += `## Priority Recommendations\n\n`;
  let n = 1;
  for (const p of products) {
    for (const r of p.recommendations) {
      if (!r.includes('No immediate action')) {
        report += `${n}. [${p.productName}] ${r}\n`;
        n++;
      }
    }
  }
  if (n === 1) report += `1. No urgent actions — all products appear healthy.\n`;

  return report;
}
