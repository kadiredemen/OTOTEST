import fs from 'fs';
import path from 'path';

export type LookupHint = {
  lookupKey: string;
  expectedValue?: string;
  ownerSelector?: string | null;
  lookupButtonSelector?: string | null;
  lookupButtonSelectorSource?: 'recorded' | 'inferred' | null;
};
export type LookupHintMap = Record<string, LookupHint>;

type NormalizedRecording = {
  lookupHints?: LookupHint[];
};

const cache = new Map<string, NormalizedRecording>();

function readNormalized(relativePath: string): NormalizedRecording {
  const absPath = path.resolve(process.cwd(), relativePath);
  if (cache.has(absPath)) return cache.get(absPath)!;

  const raw = fs.readFileSync(absPath, 'utf8');
  const parsed = JSON.parse(raw) as NormalizedRecording;
  cache.set(absPath, parsed);
  return parsed;
}

export function getRequiredLookupHint(relativePath: string, lookupKey: string): LookupHint {
  const normalized = readNormalized(relativePath);
  const hint = (normalized.lookupHints || []).find((item) => item.lookupKey === lookupKey);
  if (!hint) {
    throw new Error(`lookupHints icinde '${lookupKey}' bulunamadi: ${relativePath}`);
  }
  return hint;
}

export function getLookupHintMap(relativePath: string): LookupHintMap {
  const normalized = readNormalized(relativePath);
  const hints = normalized.lookupHints || [];
  const map: LookupHintMap = {};

  for (const hint of hints) {
    const key = String(hint.lookupKey || '').trim();
    if (!key) continue;
    if (map[key]) {
      throw new Error(`lookupHints icinde ayni lookupKey birden fazla kez var: '${key}' (${relativePath})`);
    }
    map[key] = hint;
  }

  return map;
}

export function getRequiredLookupHintFromMap(hintMap: LookupHintMap, lookupKey: string): LookupHint {
  const hint = hintMap[lookupKey];
  if (!hint) {
    throw new Error(`lookupHints map icinde '${lookupKey}' bulunamadi`);
  }
  return hint;
}

export function requireHintValue(hint: LookupHint, field: keyof LookupHint): string {
  const value = hint[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`lookupHint alanı eksik: ${String(field)} (${hint.lookupKey})`);
  }
  return value.trim();
}

export function inferLookupButtonSelectorFromInput(inputSelector: string): string {
  if (/_TE_t$/i.test(inputSelector)) return inputSelector.replace(/_TE_t$/i, '_TE_b0 > img');
  throw new Error(`Input selector'dan rehber butonu türetilemedi: ${inputSelector}`);
}
