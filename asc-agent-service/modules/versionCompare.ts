'use strict';

/**
 * Changelog-only comparison between two monthly versions (MeetingGenius semantics).
 */

import {
  MonthlyVersionGroup,
  ProductChangelogPayload,
  VersionCommit,
  findVersionGroup,
  getProductChangelog
} from './productVersionService';

export interface ComparedCommit {
  hash: string;
  message: string;
  scope?: string;
  type: VersionCommit['type'];
  description: string;
}

export interface VersionCompareResult {
  productId: string;
  productName: string;
  deployBranch: string;
  versionA: { monthKey: string; version: string; title: string; monthLabel: string };
  versionB: { monthKey: string; version: string; title: string; monthLabel: string };
  summary: {
    newFeaturesInB: number;
    featuresInANotInB: number;
    newFixesInB: number;
    fixesInANotInB: number;
  };
  newFeaturesInB: ComparedCommit[];
  featuresInANotInB: ComparedCommit[];
  newFixesInB: ComparedCommit[];
  fixesInANotInB: ComparedCommit[];
}

function normalizeSubject(message: string): string {
  return message
    .toLowerCase()
    .replace(/^[a-z]+(?:\([^)]+\))?:\s*/i, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function commitFingerprint(c: VersionCommit): string {
  const scope = (c.scope || '').toLowerCase();
  const subject = normalizeSubject(c.message);
  return `${scope}::${subject}`;
}

function toCompared(c: VersionCommit): ComparedCommit {
  return {
    hash: c.hash,
    message: c.message,
    scope: c.scope,
    type: c.type,
    description: c.description
  };
}

function diffByType(
  groupA: MonthlyVersionGroup,
  groupB: MonthlyVersionGroup,
  type: 'feat' | 'fix'
): { onlyInB: ComparedCommit[]; onlyInA: ComparedCommit[] } {
  const aItems = groupA.changes.filter(c => c.type === type);
  const bItems = groupB.changes.filter(c => c.type === type);

  const aFingerprints = new Set(aItems.map(commitFingerprint));
  const bFingerprints = new Set(bItems.map(commitFingerprint));

  const onlyInB = bItems.filter(c => !aFingerprints.has(commitFingerprint(c))).map(toCompared);
  const onlyInA = aItems.filter(c => !bFingerprints.has(commitFingerprint(c))).map(toCompared);

  return { onlyInB, onlyInA };
}

export function compareVersionGroups(
  changelog: ProductChangelogPayload,
  groupA: MonthlyVersionGroup,
  groupB: MonthlyVersionGroup
): VersionCompareResult {
  const featDiff = diffByType(groupA, groupB, 'feat');
  const fixDiff = diffByType(groupA, groupB, 'fix');

  return {
    productId: changelog.productId,
    productName: changelog.productName,
    deployBranch: changelog.deployBranch,
    versionA: {
      monthKey: groupA.monthKey,
      version: groupA.version,
      title: groupA.title,
      monthLabel: groupA.monthLabel
    },
    versionB: {
      monthKey: groupB.monthKey,
      version: groupB.version,
      title: groupB.title,
      monthLabel: groupB.monthLabel
    },
    summary: {
      newFeaturesInB: featDiff.onlyInB.length,
      featuresInANotInB: featDiff.onlyInA.length,
      newFixesInB: fixDiff.onlyInB.length,
      fixesInANotInB: fixDiff.onlyInA.length
    },
    newFeaturesInB: featDiff.onlyInB,
    featuresInANotInB: featDiff.onlyInA,
    newFixesInB: fixDiff.onlyInB,
    fixesInANotInB: fixDiff.onlyInA
  };
}

export async function compareProductVersions(
  productId: string,
  selectorA: { monthKey?: string; version?: string },
  selectorB: { monthKey?: string; version?: string }
): Promise<VersionCompareResult> {
  const changelog = await getProductChangelog(productId);
  const groupA = findVersionGroup(changelog, selectorA);
  const groupB = findVersionGroup(changelog, selectorB);

  if (!groupA) {
    throw new Error('Version A not found. Use monthKey or version label (e.g. v1.1.0).');
  }
  if (!groupB) {
    throw new Error('Version B not found. Use monthKey or version label (e.g. v1.2.0).');
  }
  if (groupA.monthKey === groupB.monthKey) {
    throw new Error('Select two different release cycles to compare.');
  }

  return compareVersionGroups(changelog, groupA, groupB);
}

export function formatCompareForLlm(compare: VersionCompareResult): string {
  const lines: string[] = [
    `Product: ${compare.productName} (${compare.deployBranch} branch)`,
    `Version A: ${compare.versionA.version} — ${compare.versionA.title} (${compare.versionA.monthLabel})`,
    `Version B: ${compare.versionB.version} — ${compare.versionB.title} (${compare.versionB.monthLabel})`,
    '',
    'Structured changelog comparison (commit messages only, no code diff):',
    JSON.stringify(
      {
        summary: compare.summary,
        newFeaturesInB: compare.newFeaturesInB,
        featuresInANotInB: compare.featuresInANotInB,
        newFixesInB: compare.newFixesInB.slice(0, 20),
        fixesInANotInB: compare.fixesInANotInB.slice(0, 20)
      },
      null,
      2
    )
  ];
  return lines.join('\n');
}
