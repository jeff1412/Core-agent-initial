'use strict';

/**
 * modules/codeAuditReporter.ts — AI code quality review from scanned file snapshots
 */

import { generateText } from './llmClient';
import { ProductCodeSnapshot } from './codeAuditScanner';
import {
  ProductVersionReleaseAnalysis,
  formatReleaseAnalysisForLlm
} from './auditVersionAnalysis';

const SYSTEM_PROMPT = `You are the ASC Agent code auditor for ASC Creative Ltd. You review actual source files from GitHub repositories and produce actionable engineering reports.

STRICT RULES:
- Base findings ONLY on the file excerpts provided. Do not invent files or issues.
- Focus on: code quality, security smells, error handling, dead code patterns, missing tests, outdated dependencies (from package.json), and maintainability.
- Separate repo metadata checks (commits, PRs) from code review — this report is about CODE inside the repo.
- Use markdown with clear sections per product.
- Be specific: cite file paths and describe the concern.
- Tone: professional, constructive, prioritized.

REQUIRED FORMAT:

## Executive Summary
2-3 sentences on overall code health across scanned products.

## Product Code Reviews

### [Product Name]
**Repository:** owner/repo
**Files scanned:** N
**Overview:** Brief assessment.

**Findings:**
- [Severity: High/Medium/Low] file/path — description

**Recommendations:**
- Numbered actionable steps

(Repeat for each product)

## Cross-Portfolio Patterns
Systemic issues seen in multiple codebases.

## Priority Actions
Top 3-5 fixes ranked by impact.`;

const VERSION_CONTEXT_SECTION = `

When version release analysis is provided, add a section ## Release continuity (changelog + code) immediately after Executive Summary:
- Compare the two monthly versions (A = older cycle, B = newer cycle) using newFeaturesInB and featuresInANotInB.
- Distinguish changelog-missing (no matching feat in B's month) vs code removed (pathsMissingAtVersionB in featureCodeChecks).
- If codeStatus is intact for a changelog-missing feat, state the feature code likely remains at B tip.
- Only flag regressions when paths are missing or scanned files contradict the release notes.
- Use markdown tables where helpful (Hash | Feature | Code status).`;

export async function generateCodeAuditReport(
  snapshots: ProductCodeSnapshot[],
  versionReleaseAnalysis?: ProductVersionReleaseAnalysis[]
): Promise<string> {
  const payload = snapshots.map(s => ({
    product: s.productName,
    repo: `${s.owner}/${s.repo}`,
    branch: s.defaultBranch,
    filesScanned: s.filesScanned,
    error: s.error,
    files: s.files.map(f => ({ path: f.path, language: f.language, excerpt: f.excerpt }))
  }));

  const hasVersionAnalysis = versionReleaseAnalysis && versionReleaseAnalysis.length > 0;
  const systemPrompt = hasVersionAnalysis ? SYSTEM_PROMPT + VERSION_CONTEXT_SECTION : SYSTEM_PROMPT;

  let userPrompt = `Generate a code audit report. Date: ${new Date().toISOString()}.\n\nScanned code:\n${JSON.stringify(payload, null, 2)}`;
  if (hasVersionAnalysis) {
    userPrompt += `\n\nVersion release analysis (GitHub path checks at newer cycle tip):\n${formatReleaseAnalysisForLlm(versionReleaseAnalysis!)}`;
  }

  return generateText(systemPrompt, userPrompt, 0.3, 4096);
}

export function fallbackCodeAuditReport(snapshots: ProductCodeSnapshot[]): string {
  let report = `## Executive Summary\n\n`;
  const scanned = snapshots.filter(s => s.filesScanned > 0).length;
  report += `${scanned} of ${snapshots.length} product(s) had scannable source files.\n\n`;
  report += `## Product Code Reviews\n\n`;

  for (const s of snapshots) {
    report += `### ${s.productName}\n`;
    report += `**Repository:** ${s.owner}/${s.repo}\n`;
    report += `**Files scanned:** ${s.filesScanned}\n\n`;
    if (s.error) {
      report += `**Error:** ${s.error}\n\n`;
      continue;
    }
    report += `**Files reviewed:**\n`;
    for (const f of s.files) {
      report += `- \`${f.path}\` (${f.language || 'unknown'}, ${f.size} chars)\n`;
    }
    report += `\n**Recommendations:**\n`;
    report += `- Run a full AI audit when LLM provider is configured.\n`;
    report += `- Review recent changes in listed files for test coverage.\n\n`;
  }

  return report;
}
