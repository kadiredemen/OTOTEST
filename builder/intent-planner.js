'use strict';

/**
 * Intent planner
 * normalized recording JSON -> constrained test-plan JSON
 *
 * The important boundary: AI may propose this plan, but TypeScript is generated
 * deterministically from the validated plan.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const ALLOWED_OPS = new Set([
  'openList',
  'openNewRecord',
  'openSelectedRecord',
  'selectLookup',
  'fillField',
  'addDetailRow',
  'editDetailQuantity',
  'saveAndClose',
  'assertReady',
]);

const RAW_ACTION_KINDS = new Set([
  'ui.click',
  'ui.dblclick',
  'ui.fill',
  'ui.select',
  'ui.check',
  'ui.keypress',
  'ui.shortcut',
  'ui.paste',
  'ui.blur',
]);

function basenameOf(normalizedPath) {
  return path.basename(normalizedPath, '-normalized.json');
}

function quoteForPrompt(value) {
  return JSON.stringify(value ?? null);
}

function extractMenuSelectors(steps) {
  return (steps || [])
    .filter((s) => s.kind === 'ui.click' && /data-menu-kod/.test(s.target?.selector || ''))
    .map((s) => s.target.selector);
}

function extractMenuCodes(steps) {
  return extractMenuSelectors(steps)
    .map((selector) => selector.match(/data-menu-kod="([^"]+)"/)?.[1])
    .filter(Boolean);
}

function findFirstClick(steps, predicate) {
  return (steps || []).find((s) => s.kind === 'ui.click' && predicate(s.target?.selector || '', s));
}

function detectFlow(normalized) {
  const steps = normalized.steps || [];
  const listRowClick = findFirstClick(steps, (selector) => /^#ListGrid_R\d+C\d+/.test(selector));
  const editClick = findFirstClick(steps, (selector, step) =>
    /^#NvgxToolbar_Item_2\b/.test(selector) && (!listRowClick || step.timestamp >= listRowClick.timestamp)
  );
  if (listRowClick && editClick) {
    return {
      type: 'edit',
      rowSelector: listRowClick.target.selector,
      actionSelector: editClick.target.selector,
    };
  }

  const newClick = findFirstClick(steps, (selector) =>
    /^#NvgxToolbar_Item_1\b/.test(selector) &&
    !selector.includes('MainNvgx') &&
    !selector.includes('DCCx')
  );
  return {
    type: 'create',
    actionSelector: newClick?.target?.selector || '#NvgxToolbar_Item_1 > span',
  };
}

function headerLookups(normalized) {
  return (normalized.lookupHints || []).filter((hint) => {
    const selector = hint.ownerSelector || '';
    return !selector.includes('DetGrd') && !selector.includes('_RT_');
  });
}

function detailLookups(normalized) {
  return (normalized.lookupHints || []).filter((hint) => {
    const selector = hint.ownerSelector || '';
    return selector.includes('DetGrd') || selector.includes('_RT_');
  });
}

function extractHeaderFills(normalized) {
  const steps = normalized.steps || [];

  const lookupOwners = new Set(
    (normalized.lookupHints || []).map((h) => h.ownerSelector).filter(Boolean)
  );

  const saveHint = (normalized.saveCloseHints || [])[0];
  const saveTimestamp = saveHint?.fromSteps?.saveClickTimestamp ?? Infinity;

  // Blur events within 5s of a lookup value being set are server-side auto-fills, not user input
  const lookupValueTimes = (normalized.lookupHints || [])
    .map((h) => h.fromStep?.valueTimestamp)
    .filter((t) => typeof t === 'number');

  // Blur events within 500ms of a context.switch (popup just closed) are popup-set values
  const popupCloseTimes = steps
    .filter((s) => s.kind === 'context.switch')
    .map((s) => s.timestamp);

  const isLookupSideEffect = (ts) =>
    lookupValueTimes.some((vt) => ts >= vt && ts <= vt + 5000);

  const isImmediatelyAfterPopupClose = (ts) =>
    popupCloseTimes.some((ct) => ts >= ct - 100 && ts <= ct + 500);

  const noisePatterns = [
    /edtUserName/i, /edtPass/i, /btnLogin/i,
    /#ListGrid/i, /NvgxToolbar/i, /data-menu-kod/i,
  ];
  const isNoise = (sel) => !sel || noisePatterns.some((rx) => rx.test(sel));

  const seen = new Set();
  const fills = [];

  for (const step of steps) {
    if (step.kind !== 'ui.blur') continue;
    const selector = step.target?.selector;
    const value = typeof step.value === 'string' ? step.value.trim() : '';
    if (!selector || !value) continue;
    if (seen.has(selector)) continue;
    if (lookupOwners.has(selector)) continue;
    if (isNoise(selector)) continue;
    if (step.timestamp > saveTimestamp) continue;
    if (isLookupSideEffect(step.timestamp)) continue;
    if (isImmediatelyAfterPopupClose(step.timestamp)) continue;

    seen.add(selector);
    fills.push({
      op: 'fillField',
      selector,
      value: step.value,
      _timestamp: step.timestamp,
    });
  }

  return fills;
}

function extractDetailEdit(normalized) {
  const detEdit = (normalized.detailEditorHints || [])[0];
  if (detEdit) {
    return {
      mode: 'add',
      triggerSelector: detEdit.addDetailButtonSelector,
      editorSelector: detEdit.firstEditorSelector,
      quantitySelector: detEdit.quantitySelector,
    };
  }

  const commit = (normalized.detailCommitHints || [])[0];
  if (!commit) return null;
  const editClick = findFirstClick(normalized.steps, (selector) => /^#DCCxGridNvgxToolbar_Item_2\b/.test(selector));
  const quantityStep = (normalized.steps || []).find((s) =>
    ['ui.fill', 'ui.blur'].includes(s.kind) &&
    s.target?.selector === commit.editorInputSelector &&
    s.value &&
    s.value !== 'Kaydet'
  );
  if (!editClick && !quantityStep) return null;
  return {
    mode: 'edit',
    triggerSelector: editClick?.target?.selector || '#DCCxGridNvgxToolbar_Item_2 > span',
    editorSelector: commit.editorInputSelector,
    quantitySelector: commit.editorInputSelector,
    quantityValue: quantityStep?.value,
  };
}

function quantityValueFor(normalized, quantitySelector, fallback = '100') {
  if (!quantitySelector) return fallback;
  const step = (normalized.steps || []).find((s) =>
    ['ui.fill', 'ui.blur'].includes(s.kind) &&
    s.target?.selector === quantitySelector &&
    typeof s.value === 'string' &&
    s.value.trim() &&
    s.value !== 'Kaydet'
  );
  return step?.value || fallback;
}

function buildDeterministicPlan(normalized, options = {}) {
  const flow = detectFlow(normalized);
  const operations = [];
  const menuCodes = extractMenuCodes(normalized.steps);
  const menuSelectors = extractMenuSelectors(normalized.steps);

  operations.push({
    op: 'openList',
    menuCodes,
    menuSelectors,
  });

  if (flow.type === 'edit') {
    operations.push({
      op: 'openSelectedRecord',
      rowSelector: flow.rowSelector,
      actionSelector: flow.actionSelector,
    });
  } else {
    operations.push({
      op: 'openNewRecord',
      actionSelector: flow.actionSelector,
    });
  }

  const lookupOps = headerLookups(normalized).map((hint) => ({
    op: 'selectLookup',
    scope: 'header',
    key: hint.lookupKey,
    value: hint.expectedValue,
    inputSelector: hint.ownerSelector,
    buttonSelector: hint.lookupButtonSelector || null,
    _timestamp: hint.fromStep?.requestTimestamp ?? 0,
  }));

  const fillOps = extractHeaderFills(normalized);

  const headerOps = [...lookupOps, ...fillOps].sort((a, b) => (a._timestamp ?? 0) - (b._timestamp ?? 0));

  for (const op of headerOps) {
    const { _timestamp, ...cleanOp } = op;
    operations.push(cleanOp);
  }

  const detailEdit = extractDetailEdit(normalized);
  const commit = (normalized.detailCommitHints || [])[0];
  if (detailEdit && commit) {
    const lookups = detailLookups(normalized).map((hint) => ({
      key: hint.lookupKey,
      value: hint.expectedValue,
      inputSelector: hint.ownerSelector,
      buttonSelector: hint.lookupButtonSelector || null,
    }));
    const quantity = quantityValueFor(normalized, detailEdit.quantitySelector, detailEdit.quantityValue || '100');
    operations.push({
      op: detailEdit.mode === 'edit' ? 'editDetailQuantity' : 'addDetailRow',
      triggerSelector: detailEdit.triggerSelector,
      editorSelector: detailEdit.editorSelector,
      quantitySelector: detailEdit.quantitySelector || null,
      quantity,
      lookups,
      okButtonSelector: commit.okButtonSelector,
      rowProofSelector: commit.rowProofSelector,
    });
  }

  if ((normalized.saveCloseHints || []).length > 0) {
    const save = normalized.saveCloseHints[0];
    operations.push({
      op: 'saveAndClose',
      saveButtonSelector: save.saveButtonSelector,
      closeButtonSelector: save.closeButtonSelector || null,
      combined: Boolean(save.combined),
    });
  }

  operations.push({ op: 'assertReady' });

  return {
    schemaVersion: '1.0',
    planner: options.planner || 'deterministic',
    recordingName: options.recordingName || null,
    generatedAt: new Date().toISOString(),
    flow: flow.type,
    operations,
  };
}

function collectNormalizedFacts(normalized) {
  const selectors = new Set();
  for (const step of normalized.steps || []) {
    if (step.target?.selector) selectors.add(step.target.selector);
  }
  for (const hint of normalized.lookupHints || []) {
    if (hint.ownerSelector) selectors.add(hint.ownerSelector);
    if (hint.lookupButtonSelector) selectors.add(hint.lookupButtonSelector);
  }
  for (const hint of normalized.detailEditorHints || []) {
    if (hint.addDetailButtonSelector) selectors.add(hint.addDetailButtonSelector);
    if (hint.firstEditorSelector) selectors.add(hint.firstEditorSelector);
    if (hint.quantitySelector) selectors.add(hint.quantitySelector);
    if (hint.okButtonSelector) selectors.add(hint.okButtonSelector);
  }
  for (const hint of normalized.detailCommitHints || []) {
    if (hint.okButtonSelector) selectors.add(hint.okButtonSelector);
    if (hint.rowProofSelector) selectors.add(hint.rowProofSelector);
    if (hint.editorInputSelector) selectors.add(hint.editorInputSelector);
  }
  for (const hint of normalized.saveCloseHints || []) {
    if (hint.saveButtonSelector) selectors.add(hint.saveButtonSelector);
    if (hint.closeButtonSelector) selectors.add(hint.closeButtonSelector);
  }
  return {
    selectors,
    lookupByKey: new Map((normalized.lookupHints || []).map((hint) => [hint.lookupKey, hint])),
  };
}

function validatePlan(plan, normalized, options = {}) {
  const errors = [];
  if (!plan || typeof plan !== 'object') errors.push('Plan object bekleniyor.');
  if (!Array.isArray(plan?.operations)) errors.push('Plan operations array olmali.');
  if (errors.length) return { ok: false, errors };

  const facts = collectNormalizedFacts(normalized);
  const hasSave = (normalized.saveCloseHints || []).length > 0;
  const hasDetail = (normalized.detailEditorHints || []).length > 0 || (normalized.detailCommitHints || []).length > 0;

  plan.operations.forEach((operation, index) => {
    if (!operation || typeof operation !== 'object') {
      errors.push(`operations[${index}] object olmali.`);
      return;
    }
    if (!ALLOWED_OPS.has(operation.op)) {
      errors.push(`operations[${index}].op izinli degil: ${operation.op}`);
      return;
    }

    if (operation.op === 'selectLookup') {
      const hint = facts.lookupByKey.get(operation.key);
      if (!hint) errors.push(`selectLookup bilinmeyen key kullaniyor: ${operation.key}`);
      if (hint && operation.value !== undefined && String(operation.value) !== String(hint.expectedValue)) {
        errors.push(`selectLookup ${operation.key} value normalized ile uyusmuyor.`);
      }
    }

    if (operation.op === 'fillField') {
      if (!operation.selector) errors.push(`fillField.selector eksik.`);
      if (operation.selector && !facts.selectors.has(operation.selector)) {
        errors.push(`fillField.selector normalized icinde yok: ${operation.selector}`);
      }
    }

    if ((operation.op === 'addDetailRow' || operation.op === 'editDetailQuantity') && !hasDetail) {
      errors.push(`${operation.op} icin normalized detail hint yok.`);
    }

    if (operation.op === 'saveAndClose' && !hasSave) {
      errors.push('saveAndClose icin normalized saveCloseHints yok.');
    }

    if (operation.op === 'rawAction') {
      if (!RAW_ACTION_KINDS.has(operation.kind)) errors.push(`rawAction kind izinli degil: ${operation.kind}`);
      if (operation.selector && !facts.selectors.has(operation.selector)) {
        errors.push(`rawAction selector normalized icinde yok: ${operation.selector}`);
      }
    }

    for (const [key, value] of Object.entries(operation)) {
      if (key.endsWith('Selector') && value && !facts.selectors.has(value)) {
        errors.push(`${operation.op}.${key} normalized icinde yok: ${value}`);
      }
    }
  });

  const first = plan.operations[0]?.op;
  const last = plan.operations[plan.operations.length - 1]?.op;
  if (first !== 'openList') errors.push('Plan openList ile baslamali.');
  if (last !== 'assertReady') errors.push('Plan assertReady ile bitmeli.');

  // AI planlar icin: baseline'daki hicbir operasyon silinemez
  if (options.baseline) {
    const planOps = plan.operations || [];
    for (const baseOp of options.baseline.operations || []) {
      let preserved = false;
      if (baseOp.op === 'selectLookup') {
        preserved = planOps.some((op) => op.op === 'selectLookup' && op.key === baseOp.key);
        if (!preserved) errors.push(`Baseline selectLookup korunmadi: key=${baseOp.key}`);
      } else if (baseOp.op === 'fillField') {
        preserved = planOps.some((op) => op.op === 'fillField' && op.selector === baseOp.selector);
        if (!preserved) errors.push(`Baseline fillField korunmadi: selector=${baseOp.selector}`);
        const kept = planOps.find((op) => op.op === 'fillField' && op.selector === baseOp.selector);
        if (kept && String(kept.value) !== String(baseOp.value)) {
          errors.push(`fillField degeri degistirildi (${baseOp.selector}): beklenen="${baseOp.value}" gelen="${kept.value}"`);
        }
      } else {
        preserved = planOps.some((op) => op.op === baseOp.op);
        if (!preserved) errors.push(`Baseline ${baseOp.op} korunmadi.`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

function compactNormalizedForAi(normalized) {
  return {
    stats: normalized.stats,
    lookupHints: normalized.lookupHints,
    detailEditorHints: normalized.detailEditorHints,
    detailCommitHints: normalized.detailCommitHints,
    saveCloseHints: normalized.saveCloseHints,
    popupLineage: normalized.popupLineage,
    frameMarkers: normalized.frameMarkers,
    steps: (normalized.steps || []).map((step) => ({
      id: step.id,
      kind: step.kind,
      selector: step.target?.selector,
      value: step.value,
      key: step.key,
      url: step.url,
      timestamp: step.timestamp,
      windowLabel: step.windowLabel,
      frameChain: step.frameChain,
    })),
  };
}

function buildAiPrompt(normalized, deterministicPlan) {
  return [
    'You are an intent planner for Playwright ERP tests.',
    'Return only valid JSON. Do not write TypeScript.',
    'Your output must match this shape:',
    '{"schemaVersion":"1.0","planner":"ai","recordingName":"...","flow":"create|edit","operations":[...]}',
    `Allowed op values: ${[...ALLOWED_OPS].join(', ')}.`,
    'Op semantics: selectLookup=open a popup and pick a value (requires a lookupHints entry); fillField=type a value directly into a plain-text input with no popup (selector and value come from ui.blur steps in normalized facts); addDetailRow/editDetailQuantity=interact with detail grid rows.',
    'Do not invent selectors, lookup keys, values, or operations that are not supported by the normalized facts.',
    'Preserve fillField ops from the baseline unless they are clearly wrong.',
    'If an action cannot be represented with the allowed ops, omit it rather than inventing a new op.',
    'Here is a deterministic baseline plan you may improve without changing facts:',
    quoteForPrompt(deterministicPlan),
    'Here are the normalized facts:',
    quoteForPrompt(compactNormalizedForAi(normalized)),
  ].join('\n\n');
}

async function requestOpenAiPlan(prompt, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY yok.');

  const model = options.model || process.env.OTOTEST_AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: prompt,
      text: { format: { type: 'json_object' } },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI planner hata verdi (${response.status}): ${body.slice(0, 500)}`);
  }

  const data = await response.json();
  const text = data.output_text ||
    data.output?.flatMap((item) => item.content || [])
      .map((content) => content.text || '')
      .join('') ||
    '';
  if (!text.trim()) throw new Error('OpenAI planner bos cevap dondu.');
  return JSON.parse(text);
}

async function requestGeminiPlan(prompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY yok.');

  const model = options.model || process.env.OTOTEST_AI_MODEL || process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini planner hata verdi (${response.status}): ${body.slice(0, 500)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('') || '';
  if (!text.trim()) throw new Error('Gemini planner bos cevap dondu.');
  return JSON.parse(text);
}

async function requestAiPlan(normalized, deterministicPlan, options = {}) {
  const prompt = buildAiPrompt(normalized, deterministicPlan);
  const provider = (options.provider || process.env.OTOTEST_AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'openai')).toLowerCase();
  if (provider === 'gemini') return requestGeminiPlan(prompt, options);
  if (provider === 'openai') return requestOpenAiPlan(prompt, options);
  throw new Error(`Bilinmeyen AI provider: ${provider}`);
}

function defaultPlanPath(normalizedPath) {
  return normalizedPath.replace(/-normalized\.json$/i, '-plan.json');
}

function readNormalized(normalizedPath) {
  return JSON.parse(fs.readFileSync(path.resolve(normalizedPath), 'utf8'));
}

function readPlanIfExists(normalizedPath) {
  const planPath = defaultPlanPath(normalizedPath);
  if (!fs.existsSync(planPath)) return null;
  return JSON.parse(fs.readFileSync(planPath, 'utf8'));
}

function writePlan(outputPath, plan) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
}

async function runCli(args) {
  const useAi = args.includes('--ai');
  const filtered = args.filter((arg) => arg !== '--ai');
  const normalizedPath = filtered[0];
  const outputPath = filtered[1] || (normalizedPath ? defaultPlanPath(path.resolve(normalizedPath)) : null);
  if (!normalizedPath || !outputPath) {
    console.log('Kullanim: node builder/intent-planner.js <recording-normalized.json> [plan.json] [--ai]');
    process.exit(1);
  }

  try {
    require('dotenv').config({ path: path.join(ROOT, '.env') });
  } catch {
    // dotenv is optional at runtime.
  }

  const normalized = readNormalized(normalizedPath);
  const deterministicPlan = buildDeterministicPlan(normalized, {
    recordingName: basenameOf(normalizedPath),
  });
  const plan = useAi
    ? await requestAiPlan(normalized, deterministicPlan)
    : deterministicPlan;

  plan.recordingName = plan.recordingName || basenameOf(normalizedPath);
  plan.planner = useAi ? 'ai' : (plan.planner || 'deterministic');
  const validation = validatePlan(plan, normalized, useAi ? { baseline: deterministicPlan } : {});
  if (!validation.ok) {
    throw new Error(`Plan validation failed:\n${validation.errors.map((e) => `- ${e}`).join('\n')}`);
  }

  writePlan(path.resolve(outputPath), plan);
  console.log(`OK Plan -> ${path.relative(ROOT, outputPath)} (${plan.planner}, ${plan.operations.length} ops)`);
}

if (require.main === module) {
  runCli(process.argv.slice(2)).catch((error) => {
    console.error(`Hata: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  ALLOWED_OPS,
  buildDeterministicPlan,
  defaultPlanPath,
  readPlanIfExists,
  validatePlan,
  requestAiPlan,
  writePlan,
};
