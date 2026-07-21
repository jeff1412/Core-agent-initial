'use strict';

/**
 * modules/claudeClient.ts — Gemini API Client for Code Generation
 */

import 'dotenv/config';

/**
 * Extracts raw code from markdown code fences if present.
 */
function extractCode(text: string): string {
  const match = text.match(/```[a-zA-Z0-9+#]*\n([\s\S]*?)```/);
  if (match && match[1]) {
    return match[1];
  }
  return text;
}

/**
 * generateCode(systemPrompt, userPrompt)
 */
export async function generateCode(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in .env');
  }

  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  console.log(`\n[Gemini Client] Initiating code generation using ${model}...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.1, // Low temperature for highly precise code generation
          maxOutputTokens: 8192
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json() as any;

    if (data.error) {
      throw new Error(data.error.message || 'Unknown Gemini API error');
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Empty response from Gemini API');
    }

    const cleanedCode = extractCode(rawText);
    console.log(`\n[Gemini Client] ✅ Code generation and extraction complete.`);
    return cleanedCode;

  } catch (error: any) {
    console.error(`\n[Gemini Client] ❌ API Error:`, error.message);
    throw error;
  }
}

export interface ChatMessage {
  role: 'user' | 'agent';
  text: string;
}

/**
 * chatWithGemini(systemPrompt, messages, userMessage)
 * Proxies dashboard chat through the server so the API key stays in .env.
 */
export async function chatWithGemini(
  systemPrompt: string,
  messages: ChatMessage[],
  userMessage: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in .env');
  }

  const model = 'gemini-2.5-flash';
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
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
  }

  const data = await response.json() as any;
  if (data.error) {
    throw new Error(data.error.message || 'Unknown Gemini API error');
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I encountered an issue processing your request.';
}

/**
 * generateText(systemPrompt, userPrompt, temperature?)
 * General-purpose Gemini text generation (reports, summaries).
 */
export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.5
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in .env');
  }

  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature, maxOutputTokens: 2048 }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
  }

  const data = await response.json() as any;
  if (data.error) {
    throw new Error(data.error.message || 'Unknown Gemini API error');
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty response from Gemini API');
  }

  return text;
}
