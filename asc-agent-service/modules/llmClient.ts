'use strict';

/**
 * modules/llmClient.ts — Unified LLM client (Gemini, OpenAI, Anthropic)
 */

import Anthropic from '@anthropic-ai/sdk';
import { getActiveLlmConfig, LlmProvider } from './llmConfigStore';

export interface ChatMessage {
  role: 'user' | 'agent';
  text: string;
}

function extractCode(text: string): string {
  const match = text.match(/```[a-zA-Z0-9+#]*\n([\s\S]*?)```/);
  return match?.[1] || text;
}

async function callGemini(
  apiKey: string, model: string, systemPrompt: string, userPrompt: string,
  temperature: number, maxOutputTokens: number
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature, maxOutputTokens }
    })
  });
  if (!response.ok) throw new Error(`Gemini API error ${response.status}: ${await response.text()}`);
  const data = await response.json() as any;
  if (data.error) throw new Error(data.error.message);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return text;
}

async function callGeminiChat(
  apiKey: string, model: string, systemPrompt: string,
  messages: ChatMessage[], userMessage: string, temperature: number, maxOutputTokens: number
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const contents = [
    ...messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    })),
    { role: 'user', parts: [{ text: userMessage }] }
  ];
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { temperature, maxOutputTokens }
    })
  });
  if (!response.ok) throw new Error(`Gemini API error ${response.status}: ${await response.text()}`);
  const data = await response.json() as any;
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini.';
}

async function callOpenAI(
  apiKey: string, model: string, systemPrompt: string, userPrompt: string,
  temperature: number, maxOutputTokens: number
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      max_tokens: maxOutputTokens
    })
  });
  if (!response.ok) throw new Error(`OpenAI API error ${response.status}: ${await response.text()}`);
  const data = await response.json() as any;
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty OpenAI response');
  return text;
}

async function callOpenAIChat(
  apiKey: string, model: string, systemPrompt: string,
  messages: ChatMessage[], userMessage: string, temperature: number, maxOutputTokens: number
): Promise<string> {
  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text
    })),
    { role: 'user', content: userMessage }
  ];
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, messages: chatMessages, temperature, max_tokens: maxOutputTokens })
  });
  if (!response.ok) throw new Error(`OpenAI API error ${response.status}: ${await response.text()}`);
  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || 'No response from OpenAI.';
}

async function callAnthropic(
  apiKey: string, model: string, systemPrompt: string, userPrompt: string,
  temperature: number, maxOutputTokens: number
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model,
    max_tokens: maxOutputTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    temperature
  });
  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('Empty Anthropic response');
  return block.text;
}

async function callAnthropicChat(
  apiKey: string, model: string, systemPrompt: string,
  messages: ChatMessage[], userMessage: string, temperature: number, maxOutputTokens: number
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model,
    max_tokens: maxOutputTokens,
    system: systemPrompt,
    messages: [
      ...messages.map(m => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.text
      })),
      { role: 'user', content: userMessage }
    ],
    temperature
  });
  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('Empty Anthropic response');
  return block.text;
}

function ensureConfigured(provider: LlmProvider, apiKey: string): void {
  if (!apiKey) {
    throw new Error(`No API key configured for ${provider}. Add one in AI Settings.`);
  }
}

export async function generateText(
  systemPrompt: string, userPrompt: string, temperature = 0.5, maxOutputTokens = 2048
): Promise<string> {
  const { provider, apiKey, model } = getActiveLlmConfig();
  ensureConfigured(provider, apiKey);
  console.log(`[LLM] generateText via ${provider}/${model}`);

  if (provider === 'gemini') return callGemini(apiKey, model, systemPrompt, userPrompt, temperature, maxOutputTokens);
  if (provider === 'openai') return callOpenAI(apiKey, model, systemPrompt, userPrompt, temperature, maxOutputTokens);
  return callAnthropic(apiKey, model, systemPrompt, userPrompt, temperature, maxOutputTokens);
}

export async function generateCode(systemPrompt: string, userPrompt: string): Promise<string> {
  const raw = await generateText(systemPrompt, userPrompt, 0.1, 8192);
  return extractCode(raw);
}

export async function chatWithLlm(
  systemPrompt: string, messages: ChatMessage[], userMessage: string
): Promise<string> {
  const { provider, apiKey, model } = getActiveLlmConfig();
  ensureConfigured(provider, apiKey);
  console.log(`[LLM] chat via ${provider}/${model}`);

  if (provider === 'gemini') return callGeminiChat(apiKey, model, systemPrompt, messages, userMessage, 0.7, 2048);
  if (provider === 'openai') return callOpenAIChat(apiKey, model, systemPrompt, messages, userMessage, 0.7, 2048);
  return callAnthropicChat(apiKey, model, systemPrompt, messages, userMessage, 0.7, 2048);
}

export function getActiveLlmLabel(): string {
  const { provider, model } = getActiveLlmConfig();
  const names: Record<LlmProvider, string> = {
    gemini: 'Gemini',
    openai: 'GPT',
    anthropic: 'Claude'
  };
  return `${names[provider]} · ${model}`;
}
