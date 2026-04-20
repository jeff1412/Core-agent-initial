'use strict';

/**
 * modules/claudeClient.ts — Anthropic Claude API Client
 */

import Anthropic from '@anthropic-ai/sdk';

/**
 * generateCode(systemPrompt, userPrompt)
 */
export async function generateCode(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set in .env');
  }

  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  console.log(`\n[Claude Client] Initiating code generation...`);

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4096,
      temperature: 0,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    });

    const responseText = msg.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n');

    console.log(`\n[Claude Client] ✅ Generation complete.`);
    return responseText;

  } catch (error: any) {
    console.error(`\n[Claude Client] ❌ API Error:`, error.message);
    throw error;
  }
}
