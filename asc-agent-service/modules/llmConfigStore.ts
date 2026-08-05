'use strict';

/**
 * modules/llmConfigStore.ts — Dashboard-managed LLM provider configuration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, '..', 'llm-config.json');

export type LlmProvider = 'gemini' | 'openai' | 'anthropic';

export interface ProviderConfig {
  apiKey: string;
  model: string;
}

export interface LlmConfig {
  activeProvider: LlmProvider;
  providers: Record<LlmProvider, ProviderConfig>;
}

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  gemini: 'gemini-3.5-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-5'
};

/** Deprecated Gemini IDs → current replacement. */
const GEMINI_MODEL_MIGRATIONS: Record<string, string> = {
  'gemini-2.5-flash': 'gemini-3.5-flash',
  'gemini-2.5-flash-lite': 'gemini-3.5-flash-lite',
  'gemini-2.5-pro': 'gemini-3.5-flash',
  'gemini-2.0-flash': 'gemini-3.5-flash',
  'gemini-2.0-flash-001': 'gemini-3.5-flash',
  'gemini-2.0-flash-lite': 'gemini-3.5-flash-lite',
  'gemini-2.0-flash-lite-001': 'gemini-3.5-flash-lite',
  'gemini-1.5-pro': 'gemini-3.5-flash',
  'gemini-1.5-flash': 'gemini-3.5-flash',
  'gemini-1.5-flash-8b': 'gemini-3.5-flash-lite',
};

/** Deprecated Claude IDs → current replacement. */
const ANTHROPIC_MODEL_MIGRATIONS: Record<string, string> = {
  'claude-sonnet-4-20250514': 'claude-sonnet-5',
  'claude-sonnet-4-5-20250929': 'claude-sonnet-5',
  'claude-sonnet-4-5': 'claude-sonnet-5',
  'claude-sonnet-4-6': 'claude-sonnet-5',
  'claude-3-7-sonnet-20250219': 'claude-sonnet-5',
  'claude-3-5-sonnet-20241022': 'claude-sonnet-5',
  'claude-3-5-sonnet-latest': 'claude-sonnet-5',
  'claude-3-5-haiku-20241022': 'claude-haiku-4-5',
  'claude-3-haiku-20240307': 'claude-haiku-4-5',
  'claude-opus-4-20250514': 'claude-opus-4-6',
  'claude-opus-4-1-20250805': 'claude-opus-4-6',
  'claude-opus-4-5-20251101': 'claude-opus-4-6',
};

export function migrateGeminiModel(model: string): string {
  return GEMINI_MODEL_MIGRATIONS[model] || model;
}

export function migrateAnthropicModel(model: string): string {
  return ANTHROPIC_MODEL_MIGRATIONS[model] || model;
}

function migrateProviderModel(provider: LlmProvider, model: string): string {
  if (provider === 'gemini') return migrateGeminiModel(model);
  if (provider === 'anthropic') return migrateAnthropicModel(model);
  return model;
}

function envFallbackKey(provider: LlmProvider): string | null {
  if (provider === 'gemini') return process.env.GEMINI_API_KEY || null;
  if (provider === 'openai') return process.env.OPENAI_API_KEY || null;
  if (provider === 'anthropic') return process.env.ANTHROPIC_API_KEY || null;
  return null;
}

function readConfig(): LlmConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      const normalized = normalizeConfig(data);
      let migrated = false;

      for (const p of ['gemini', 'anthropic'] as LlmProvider[]) {
        const saved = data.providers?.[p]?.model;
        if (saved && migrateProviderModel(p, saved) !== saved) {
          migrated = true;
          console.log(`[LLM Config] Migrated ${p} model ${saved} → ${normalized.providers[p].model}`);
        }
      }

      if (migrated) writeConfig(normalized);
      return normalized;
    }
  } catch {
    console.warn('[LLM Config] Could not read config, using defaults');
  }
  return normalizeConfig({});
}

function normalizeConfig(raw: Partial<LlmConfig>): LlmConfig {
  const providers: Partial<Record<LlmProvider, Partial<ProviderConfig>>> = raw.providers || {};
  return {
    activeProvider: raw.activeProvider || 'gemini',
    providers: {
      gemini: {
        apiKey: providers.gemini?.apiKey || process.env.GEMINI_API_KEY || '',
        model: migrateGeminiModel(providers.gemini?.model || DEFAULT_MODELS.gemini)
      },
      openai: {
        apiKey: providers.openai?.apiKey || process.env.OPENAI_API_KEY || '',
        model: providers.openai?.model || DEFAULT_MODELS.openai
      },
      anthropic: {
        apiKey: providers.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY || '',
        model: migrateAnthropicModel(providers.anthropic?.model || DEFAULT_MODELS.anthropic)
      }
    }
  };
}

function writeConfig(config: LlmConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function maskKey(key: string): string | null {
  if (!key) return null;
  return key.length <= 4 ? '****' : `****${key.slice(-4)}`;
}

export function getLlmConfig(): LlmConfig {
  return readConfig();
}

export function getActiveLlmConfig(): { provider: LlmProvider; apiKey: string; model: string } {
  const config = readConfig();
  const provider = config.activeProvider;
  const stored = config.providers[provider];
  const apiKey = stored.apiKey || envFallbackKey(provider) || '';
  return { provider, apiKey, model: stored.model || DEFAULT_MODELS[provider] };
}

export interface LlmConfigStatus {
  activeProvider: LlmProvider;
  activeModel: string;
  providers: Record<LlmProvider, {
    model: string;
    configured: boolean;
    masked: string | null;
    isActive: boolean;
  }>;
}

export function getLlmConfigStatus(): LlmConfigStatus {
  const config = readConfig();
  const providers = {} as LlmConfigStatus['providers'];
  for (const p of ['gemini', 'openai', 'anthropic'] as LlmProvider[]) {
    const key = config.providers[p].apiKey || envFallbackKey(p) || '';
    providers[p] = {
      model: config.providers[p].model,
      configured: !!key,
      masked: maskKey(key),
      isActive: config.activeProvider === p
    };
  }
  return {
    activeProvider: config.activeProvider,
    activeModel: config.providers[config.activeProvider].model,
    providers
  };
}

export function saveLlmConfig(update: Partial<LlmConfig>): LlmConfigStatus {
  const current = readConfig();
  if (update.activeProvider) {
    current.activeProvider = update.activeProvider;
  }
  if (update.providers) {
    for (const p of ['gemini', 'openai', 'anthropic'] as LlmProvider[]) {
      if (update.providers[p]) {
        if (update.providers[p].apiKey !== undefined && update.providers[p].apiKey !== '') {
          current.providers[p].apiKey = update.providers[p].apiKey;
        }
        if (update.providers[p].model) {
          current.providers[p].model = migrateProviderModel(p, update.providers[p].model);
        }
      }
    }
  }
  writeConfig(current);
  return getLlmConfigStatus();
}

export function setActiveProvider(provider: LlmProvider): LlmConfigStatus {
  return saveLlmConfig({ activeProvider: provider });
}

export const LLM_MODEL_OPTIONS: Record<LlmProvider, string[]> = {
  gemini: [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite'
  ],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
  anthropic: [
    'claude-sonnet-5',
    'claude-haiku-4-5',
    'claude-opus-4-6',
    'claude-sonnet-4-6'
  ]
};
