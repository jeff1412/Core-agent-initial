'use strict';

/**
 * Version compare + GitHub path checks for code audit runs (last two monthly cycles).
 */

import { getProductChangelog, OnboardedProduct } from './productVersionService';
import { compareVersionGroups, VersionCompareResult } from './versionCompare';
import { buildVersionCodeContext, VersionCodeContext } from './versionCodeContext';

export interface ProductVersionReleaseAnalysis {
  productId: string;
  productName: string;
  compare: VersionCompareResult;
  codeContext: VersionCodeContext;
}

export function codeCheckStatus(
  check: VersionCodeContext['featureCodeChecks'][number]
): 'intact' | 'partial' | 'missing' | 'unknown' {
  if (check.githubStatus !== 'ok') return 'unknown';
  if (check.filesTouched.length === 0) return 'unknown';
  if (check.pathsMissingAtVersionB.length === 0) return 'intact';
  if (check.pathsPresentAtVersionB.length === 0) return 'missing';
  return 'partial';
}

export async function buildProductVersionReleaseAnalysis(
  products: OnboardedProduct[],
  cycles = 2
): Promise<ProductVersionReleaseAnalysis[]> {
  const results: ProductVersionReleaseAnalysis[] = [];

  for (const product of products) {
    if (!product.versionChangelog?.enabled) continue;
    try {
      const changelog = await getProductChangelog(product.id);
      if (changelog.versions.length < Math.min(2, cycles)) continue;

      const groupB = changelog.versions[0];
      const groupA = changelog.versions[1];
      const compare = compareVersionGroups(changelog, groupA, groupB);
      const codeContext = await buildVersionCodeContext(changelog, compare, groupA, groupB);

      results.push({
        productId: product.id,
        productName: product.name,
        compare,
        codeContext
      });
    } catch (e: any) {
      console.warn(`[Code Audit] Version analysis skipped for ${product.id}:`, e.message);
    }
  }

  return results;
}

export function formatReleaseAnalysisForLlm(analyses: ProductVersionReleaseAnalysis[]): string {
  return analyses
    .map(a => {
      const checks = a.codeContext.featureCodeChecks.map(c => ({
        hash: c.hash,
        message: c.message,
        codeStatus: codeCheckStatus(c),
        pathsMissingAtVersionB: c.pathsMissingAtVersionB,
        pathsPresentAtVersionB: c.pathsPresentAtVersionB.slice(0, 8)
      }));

      return JSON.stringify(
        {
          product: a.productName,
          versionA: a.compare.versionA,
          versionB: a.compare.versionB,
          summary: a.compare.summary,
          newFeaturesInB: a.compare.newFeaturesInB.slice(0, 15),
          featuresInANotInB: a.compare.featuresInANotInB.slice(0, 15),
          featureCodeChecks: checks,
          compareRange: a.codeContext.compareRange,
          interpretationGuide: a.codeContext.interpretationGuide
        },
        null,
        2
      );
    })
    .join('\n\n');
}
