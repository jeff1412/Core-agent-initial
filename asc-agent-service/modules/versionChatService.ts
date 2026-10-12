'use strict';

import { ChatMessage } from './llmClient';
import { compareProductVersionsFull } from './versionCompare';
import { buildVersionCodeContext, formatCodeContextForLlm, VersionProgressEvent } from './versionCodeContext';
import { formatCompareForLlm } from './versionCompare';

export interface VersionChatRequest {
  productId: string;
  messages: ChatMessage[];
  userMessage: string;
  versionA?: string;
  versionB?: string;
  monthKeyA?: string;
  monthKeyB?: string;
}

export async function buildVersionChatPrompt(
  req: VersionChatRequest,
  onProgress?: (ev: VersionProgressEvent) => void
): Promise<{ systemPrompt: string; history: ChatMessage[]; userMessage: string }> {
  onProgress?.({ kind: 'step', message: 'Loading product changelog from GitHub…' });

  const { compare, changelog, groupA, groupB } = await compareProductVersionsFull(
    req.productId,
    { version: req.versionA, monthKey: req.monthKeyA },
    { version: req.versionB, monthKey: req.monthKeyB }
  );

  onProgress?.({
    kind: 'step',
    message: `Compared ${compare.versionA.version} (${compare.versionA.monthLabel}) → ${compare.versionB.version} (${compare.versionB.monthLabel})`
  });

  const codeContext = await buildVersionCodeContext(changelog, compare, groupA, groupB, onProgress);

  const systemPrompt = `You are the ASC Agent version analyst for ASC Creative Ltd.
You answer questions about monthly product releases using the changelog comparison AND GitHub code evidence below.
Rules:
- Distinguish two meanings of "missing":
  1) Changelog missing: feat commit in Version A's month with no matching subject/scope in Version B's month (featuresInANotInB).
  2) Code missing: paths from that feat commit are absent at Version B tip (pathsMissingAtVersionB in featureCodeChecks).
- When the user asks about "code" or exact features removed from the product, use featureCodeChecks first.
- If all paths for a feat are still present at Version B tip, say the feature code likely remains even though B had no new commit for it.
- Only list a feature as "removed from codebase" when pathsMissingAtVersionB covers the meaningful files or compare evidence supports removal.
- When asked what's new, use newFeaturesInB.
- Be clear which version labels you mean (${compare.versionA.version} vs ${compare.versionB.version}).
- Professional, concise markdown; cite commit hashes and file paths when discussing code.`;

  const contextBlock = formatCompareForLlm(compare);
  const codeBlock = formatCodeContextForLlm(codeContext);
  const versionSummaries = changelog.versions
    .filter(v => v.monthKey === compare.versionA.monthKey || v.monthKey === compare.versionB.monthKey)
    .map(v => ({
      version: v.version,
      title: v.title,
      description: v.description,
      stats: v.stats
    }));

  const augmentedPrompt = `${systemPrompt}\n\n---\nVersion metadata:\n${JSON.stringify(versionSummaries, null, 2)}\n\n---\n${contextBlock}\n\n---\n${codeBlock}`;

  return {
    systemPrompt: augmentedPrompt,
    history: Array.isArray(req.messages) ? req.messages : [],
    userMessage: req.userMessage
  };
}
