'use strict';

/**
 * modules/claudeClient.ts — Re-exports unified LLM client (backward compatibility)
 */

export { generateCode, generateText, chatWithLlm as chatWithGemini, getActiveLlmLabel } from './llmClient';
export type { ChatMessage } from './llmClient';
