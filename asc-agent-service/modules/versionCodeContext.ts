'use strict';

/**
 * GitHub file-level checks for version compare (paths touched by v1.2 feats vs v1.3 tip).
 */

import { Octokit } from '@octokit/rest';
import { getGithubToken } from './githubTokenStore';
import {
  MonthlyVersionGroup,
  ProductChangelogPayload,
  VersionCommit
} from './productVersionService';
import { VersionCompareResult } from './versionCompare';

const MAX_FEATURES_TO_CHECK = 10;
const MAX_FILES_PER_COMMIT = 25;

export interface FeatureCodeCheck {
  hash: string;
  message: string;
  filesTouched: string[];
  pathsMissingAtVersionB: string[];
  pathsPresentAtVersionB: string[];
  githubStatus: 'ok' | 'commit_not_found' | 'error';
  detail?: string;
}

export interface VersionCodeContext {
  versionBRefSha: string;
  versionBLabel: string;
  compareRange: {
    baseSha: string;
    headSha: string;
    filesChanged: number;
    commitsBetween: number;
  } | null;
  featureCodeChecks: FeatureCodeCheck[];
  interpretationGuide: string;
}

function monthTipSha(group: MonthlyVersionGroup): string | null {
  if (group.changes.length === 0) return null;
  let newest = group.changes[0];
  for (const c of group.changes) {
    if (c.date > newest.date || (c.date === newest.date && c.fullHash > newest.fullHash)) {
      newest = c;
    }
  }
  return newest.fullHash || null;
}

function findCommitInGroup(group: MonthlyVersionGroup, shortHash: string): VersionCommit | undefined {
  const h = shortHash.toLowerCase();
  return group.changes.find(
    c => c.hash.toLowerCase() === h || c.fullHash.toLowerCase().startsWith(h)
  );
}

async function pathExistsAtRef(
  octokit: Octokit,
  owner: string,
  repo: string,
  filePath: string,
  ref: string
): Promise<boolean> {
  try {
    await octokit.repos.getContent({ owner, repo, path: filePath, ref });
    return true;
  } catch (e: any) {
    if (e.status === 404) return false;
    throw e;
  }
}

export async function buildVersionCodeContext(
  changelog: ProductChangelogPayload,
  compare: VersionCompareResult,
  groupA: MonthlyVersionGroup,
  groupB: MonthlyVersionGroup
): Promise<VersionCodeContext> {
  const token = getGithubToken();
  const owner = changelog.owner;
  const repo = changelog.repo;
  const versionBLabel = `${compare.versionB.version} (${compare.versionB.monthLabel}) tip`;

  const empty: VersionCodeContext = {
    versionBRefSha: '',
    versionBLabel,
    compareRange: null,
    featureCodeChecks: [],
    interpretationGuide:
      'GitHub token not configured — code path checks unavailable. Use Repositories → GitHub token on Vanguard.'
  };

  if (!token) return empty;

  const shaEndA = monthTipSha(groupA);
  const shaEndB = monthTipSha(groupB);
  if (!shaEndB) {
    return {
      ...empty,
      interpretationGuide: 'Could not resolve Version B tip commit on main.'
    };
  }

  const octokit = new Octokit({ auth: token });
  let compareRange: VersionCodeContext['compareRange'] = null;

  if (shaEndA && shaEndB) {
    try {
      const { data } = await octokit.repos.compareCommits({
        owner,
        repo,
        base: shaEndA,
        head: shaEndB
      });
      compareRange = {
        baseSha: shaEndA.slice(0, 7),
        headSha: shaEndB.slice(0, 7),
        filesChanged: data.files?.length ?? 0,
        commitsBetween: data.total_commits ?? 0
      };
    } catch {
      compareRange = null;
    }
  }

  const featureCodeChecks: FeatureCodeCheck[] = [];
  const feats = compare.featuresInANotInB.slice(0, MAX_FEATURES_TO_CHECK);

  for (const feat of feats) {
    const commitMeta = findCommitInGroup(groupA, feat.hash);
    const sha = commitMeta?.fullHash || feat.hash;

    try {
      const { data: commitDetail } = await octokit.repos.getCommit({ owner, repo, ref: sha });
      const filesTouched = (commitDetail.files || [])
        .filter(f => f.filename && f.status !== 'removed')
        .map(f => f.filename)
        .slice(0, MAX_FILES_PER_COMMIT);

      const pathsPresentAtVersionB: string[] = [];
      const pathsMissingAtVersionB: string[] = [];

      for (const filePath of filesTouched) {
        const exists = await pathExistsAtRef(octokit, owner, repo, filePath, shaEndB);
        if (exists) pathsPresentAtVersionB.push(filePath);
        else pathsMissingAtVersionB.push(filePath);
      }

      featureCodeChecks.push({
        hash: feat.hash,
        message: feat.message,
        filesTouched,
        pathsMissingAtVersionB,
        pathsPresentAtVersionB,
        githubStatus: 'ok'
      });
    } catch (e: any) {
      featureCodeChecks.push({
        hash: feat.hash,
        message: feat.message,
        filesTouched: [],
        pathsMissingAtVersionB: [],
        pathsPresentAtVersionB: [],
        githubStatus: e.status === 404 ? 'commit_not_found' : 'error',
        detail: e.message
      });
    }
  }

  return {
    versionBRefSha: shaEndB.slice(0, 7),
    versionBLabel,
    compareRange,
    featureCodeChecks,
    interpretationGuide:
      'Changelog "not in B" means no matching feat commit in B\'s month — NOT automatic code removal. ' +
      'Use featureCodeChecks: if pathsPresentAtVersionB lists the files from that feat commit, the implementation likely still exists at Version B tip. ' +
      'pathsMissingAtVersionB suggests those paths were removed or renamed by B tip. Answer code questions using this GitHub evidence.'
  };
}

export function formatCodeContextForLlm(ctx: VersionCodeContext): string {
  return `GitHub code evidence (branch tip for ${ctx.versionBLabel}, ref ${ctx.versionBRefSha}):\n${JSON.stringify(
    {
      compareRange: ctx.compareRange,
      featureCodeChecks: ctx.featureCodeChecks,
      interpretationGuide: ctx.interpretationGuide
    },
    null,
    2
  )}`;
}
