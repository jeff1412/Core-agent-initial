'use strict';

/**
 * modules/mattermostNotifier.ts — Mattermost Notification Poster
 */

import https from 'https';
import { URL } from 'url';

// Map of product names to channels
const PRODUCT_CHANNEL_MAP: Record<string, string> = {
  'meetinggenius': 'mg-dev',
  'janus': 'janus-dev',
};

interface MattermostPayload {
  channel_id: string;
  message: string;
  root_id?: string;
  file_ids?: string[];
  props?: any;
}

/**
 * Helper to post to the Mattermost REST API
 */
async function postToMattermost(payload: MattermostPayload): Promise<any> {
  const url = process.env.MATTERMOST_URL;
  const token = process.env.MATTERMOST_BOT_TOKEN;

  if (!url || !token) {
    console.warn('[Notifier] ⚠️ MATTERMOST_URL or MATTERMOST_BOT_TOKEN not set. Skipping post.');
    return;
  }

  const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const parsedUrl = new URL(baseUrl);
    
    const options: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: '/api/v4/posts',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (d) => responseBody += d);
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseBody));
        } else {
          reject(new Error(`Mattermost API Error: ${res.statusCode} ${responseBody}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

/**
 * postTaskAccepted(rootPostId, channelId)
 */
export async function postTaskAccepted(rootPostId: string, channelId: string) {
  const payload: MattermostPayload = {
    channel_id: channelId,
    root_id: rootPostId,
    message: '✅ **Task Accepted.** Claude is working on the solution now.',
  };
  return postToMattermost(payload);
}

/**
 * postPRSummary(productName, prUrl, description)
 */
export async function postPRSummary(productName: string, prUrl: string, description: string) {
  const channelId = process.env.MATTERMOST_DEV_CHANNEL_ID || 'dummy-id';
  const payload: MattermostPayload = {
    channel_id: channelId,
    message: `### 🚀 New Draft PR for ${productName}\n**Task:** ${description}\n**PR Link:** ${prUrl}`,
  };
  return postToMattermost(payload);
}

/**
 * postEscalation(reason, rootPostId, channelId)
 */
export async function postEscalation(reason: string, rootPostId: string, channelId: string) {
  const alertsChannelId = process.env.MATTERMOST_ALERTS_CHANNEL_ID;
  const payload: MattermostPayload = {
    channel_id: alertsChannelId || channelId,
    message: `## 🚨 Agent Escalation Required\n**Reason:** ${reason}`,
  };
  return postToMattermost(payload);
}

/**
 * postMissingFields(rootPostId, channelId, missingFields)
 */
export async function postMissingFields(rootPostId: string, channelId: string, missingFields: string[]) {
  const fieldsNote = missingFields.map(f => `- ${f}`).join('\n');
  const payload: MattermostPayload = {
    channel_id: channelId,
    root_id: rootPostId,
    message: `❌ **Incomplete Task Brief.**\n\nMissing fields:\n${fieldsNote}`,
  };
  return postToMattermost(payload);
}
