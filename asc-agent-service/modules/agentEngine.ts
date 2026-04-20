'use strict';

/**
 * modules/agentEngine.ts — The Orchestration Heart
 */

import { validate } from './briefValidator';
import { checkForEscalation } from './escalationHandler';
import { assembleContext } from './contextAssembler';
import { generateCode } from './claudeClient';
import { createDraftPR } from './githubWriter';
import { postTaskAccepted, postPRSummary, postEscalation, postMissingFields } from './mattermostNotifier';
import { logEvent } from './eventLogger';
import { recordEscalation } from './escalationManager';

export interface PipelinePayload {
  text: string;
  post_id: string;
  channel_id: string;
}

/**
 * runPipeline(payload)
 */
export async function runPipeline(payload: PipelinePayload) {
  const text = payload.text || '';
  const postId = payload.post_id || '';
  const channelId = payload.channel_id || '';

  console.log(`\n[Agent Engine] ⚡ Pipeline started for Post: ${postId}`);
  logEvent('info', `Pipeline started for task: ${postId.substring(0,8)}...`);

  try {
    // 1. Validation
    const validation = validate(text);
    if (!validation.isValid) {
      logEvent('warning', 'Task brief validation failed', { missing: validation.missingFields });
      await postMissingFields(postId, channelId, validation.missingFields);
      return;
    }
    const brief = validation.parsedFields;
    logEvent('success', `Brief validated for product: ${brief['Product']}`);

    // 2. Escalation Check
    const escalation = checkForEscalation(brief);
    if (escalation.escalated && escalation.reason) {
      logEvent('warning', `Escalation triggered: ${escalation.reason}`);
      recordEscalation(escalation.reason, brief['Product'], brief['Reference Files'], 'Manual review of the sensitive module required.');
      await postEscalation(escalation.reason, postId, channelId);
      return;
    }

    // 3. Acknowledge Receipt
    await postTaskAccepted(postId, channelId);

    // 4. Context Assembly
    logEvent('info', 'Assembling codebase context...');
    const { contextString, repoOwner, repoName } = await assembleContext(brief['Product'], brief['Reference Files']);
    logEvent('success', 'Context assembled successfully');

    // 5. Code Generation
    logEvent('info', 'Calling Claude API for solution generation...');
    const userPrompt = `TASK BRIEF:\n${text}\n\nREFERENCE FILES CONTENT:\n${contextString}\n\nPlease generate the code changes requested. Return only the code in markdown blocks.`.trim();

    const generatedCode = await generateCode(contextString, userPrompt);
    logEvent('success', 'Claude generated solution');

    // 6. GitHub Write
    logEvent('info', 'Creating branch and Draft PR on GitHub...');
    const prUrl = await createDraftPR({
      productRepo: repoName || brief['Product'].toLowerCase(),
      productOwner: repoOwner,
      description: brief['Task Type'] + ': ' + brief['Description'].substring(0, 30),
      filePath: (brief['Reference Files'] || 'agent-output.md').split(',')[0].trim(),
      fileContent: generatedCode,
      taskBrief: brief
    });
    logEvent('success', `Draft PR created: ${prUrl}`);

    // 7. Final Notification
    await postPRSummary(brief['Product'], prUrl, brief['Description']);
    logEvent('info', 'Mattermost notification sent to product channel');

  } catch (error: any) {
    console.error(`\n[Agent Engine] 💀 CRITICAL ERROR:`, error.message);
    logEvent('error', `Critical pipeline failure: ${error.message}`);
    
    try {
      recordEscalation(`Critical Pipeline Error: ${error.message}`, 'SYSTEM', 'Engine Pipeline', 'Inspect server logs.');
      await postEscalation(`Critical Pipeline Error: ${error.message}`, postId, channelId);
    } catch (notifierError: any) {
      console.error(`[Agent Engine] Failed to even post error alert:`, notifierError.message);
    }
  }
}
