'use strict';

/**
 * OTOTEST Code Builder
 * Normalized recording JSON -> shared POM + generated spec (deterministic, no AI)
 */

const fs = require('fs');
const path = require('path');
const {
  buildDeterministicPlan,
  defaultPlanPath,
  readPlanIfExists,
  validatePlan,
} = require('./intent-planner');

const ROOT = path.resolve(__dirname, '..');

function toPascalCase(str) {
  return String(str || '')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function toHumanLabel(str) {
  return String(str || '')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function quote(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function regexArrayForPath(urlPath) {
  if (!urlPath) return '[]';
  const escaped = urlPath.replace(/\//g, '\\/').replace(/\.aspx$/i, '\\.aspx');
  return `[/${escaped}/i]`;
}

function basenameOf(normalizedPath) {
  return path.basename(normalizedPath, '-normalized.json');
}

function fieldLabelFromSelector(selector) {
  const m = (selector || '').match(/edt([A-Za-z]+)(?:_TE_t|_ME)?/);
  if (m) return m[1].replace(/([A-Z])/g, ' $1').trim();
  return (selector || '').replace(/^#/, '').split(/[_\s>]+/).filter(Boolean).pop() || selector;
}

function stripOperationSuffix(name) {
  return name.replace(/(olusturma|duzenle)$/i, '');
}

function commonPrefix(values) {
  if (!values.length) return '';
  let prefix = values[0];
  for (const value of values.slice(1)) {
    while (prefix && !value.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
    }
  }
  return prefix.replace(/[-_\s]+$/g, '');
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

function extractListUrlPath(normalized) {
  for (const marker of Object.values(normalized.frameMarkers || {})) {
    if (marker.url && /List\.aspx/i.test(marker.url)) {
      try { return new URL(marker.url).pathname; } catch { /* ignore */ }
    }
  }
  const step = (normalized.steps || []).find((s) => /List\.aspx/i.test(s.url || ''));
  if (step?.url) {
    try { return new URL(step.url).pathname; } catch { /* ignore */ }
  }
  return null;
}

function extractFormUrlPath(normalized) {
  for (const step of normalized.steps || []) {
    if (!step.url) continue;
    try {
      const pathname = new URL(step.url).pathname;
      if (/DML\.aspx$/i.test(pathname) && !/List\.aspx$/i.test(pathname)) return pathname;
    } catch { /* ignore */ }
  }
  for (const popup of normalized.popupLineage || []) {
    const url = popup.firstSeenUrl || '';
    try {
      const pathname = new URL(url).pathname;
      if (/DML\.aspx$/i.test(pathname) && !/List\.aspx$/i.test(pathname)) return pathname;
    } catch { /* ignore */ }
    }
  return null;
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

function pageKeyFor(normalized) {
  const listPath = extractListUrlPath(normalized);
  if (listPath) return `list:${listPath.toLowerCase()}`;
  const menuCodes = extractMenuCodes(normalized.steps);
  if (menuCodes.length) return `menu:${menuCodes.join('>')}`;
  const headerKeys = headerLookups(normalized).map((hint) => hint.lookupKey).sort();
  return `signature:${headerKeys.join('|') || 'unknown'}`;
}

function classNameForGroup(records) {
  const baseNames = records.map((record) => stripOperationSuffix(record.basename));
  const prefix = commonPrefix(baseNames);
  if (prefix.length >= 4) return `${toPascalCase(prefix)}Page`;

  const listPath = extractListUrlPath(records[0].normalized);
  if (listPath) {
    const pageName = path.basename(listPath, '.aspx').replace(/DMLList$/i, '').replace(/List$/i, '');
    return `${toPascalCase(pageName)}Page`;
  }
  return `${toPascalCase(records[0].basename)}Page`;
}

function mergeLookupHints(records) {
  const map = new Map();
  for (const record of records) {
    for (const hint of record.normalized.lookupHints || []) {
      if (!map.has(hint.lookupKey)) map.set(hint.lookupKey, hint);
    }
  }
  return [...map.values()];
}

function preferredRecord(records, flowType) {
  return records.find((record) => detectFlow(record.normalized).type === flowType) || records[0];
}

function cleanGeneratedFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.ts')) continue;
    const fullPath = path.join(dir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('Otomatik uretildi')) fs.unlinkSync(fullPath);
  }
}

function buildDetailMethod(record, methodName, quantityDefault) {
  if (!record) return '';
  const normalized = record.normalized;
  const detailEdit = extractDetailEdit(normalized);
  const detComm = (normalized.detailCommitHints || [])[0];
  if (!detailEdit || !detComm) return '';

  const dLookups = detailLookups(normalized);
  const proofLines = (detComm.recommendedProofs || [])
    .filter((proof) => proof.state === 'hidden' || proof.state === 'visible')
    .map((proof) => `        { selector: '${quote(proof.selector)}', state: '${proof.state}' as const },`);

  return `
  async ${methodName}(quantity = '${quote(quantityDefault || detailEdit.quantityValue || '100')}'): Promise<void> {
    const frame = await this.resolveFormFrame(10000);
    await this.ensureEditorVisibleAfterTriggerInFrame(
      frame, this.S_${methodName.toUpperCase()}_TRIGGER, this.S_${methodName.toUpperCase()}_EDITOR, { attempts: 3, timeoutPerAttempt: 5000 }
    );
${dLookups.map((hint) => `    await this.selectLookupByKey('${quote(hint.lookupKey)}');`).join('\n')}
${detailEdit.quantitySelector ? `    await this.fillRobustInFrame(frame, this.S_${methodName.toUpperCase()}_QTY, quantity);
    await frame.locator(this.S_${methodName.toUpperCase()}_QTY).first().press('Tab');` : ''}
    await this.commitDetailRowByProofsInFrame(frame, {
      okButtonSelector: this.S_${methodName.toUpperCase()}_OK,
      rowProofSelector: this.S_${methodName.toUpperCase()}_ROW,
      retries: 2,
      timeout: 10000,
      proofSelectors: [
${proofLines.join('\n')}
      ],
    });
  }
`;
}

function buildPOMForGroup(records, className) {
  const createRecord = records.find((record) => detectFlow(record.normalized).type === 'create');
  const editRecord = records.find((record) => detectFlow(record.normalized).type === 'edit');
  const representative = createRecord || editRecord || records[0];
  const normalized = representative.normalized;
  const menu = extractMenuSelectors(normalized.steps);
  const listPath = extractListUrlPath(normalized);
  const formPath = extractFormUrlPath(createRecord?.normalized || editRecord?.normalized || normalized);
  const lookupHints = mergeLookupHints(records);
  const hLookups = headerLookups(createRecord?.normalized || normalized);
  const save = (normalized.saveCloseHints || [])[0] || (createRecord?.normalized.saveCloseHints || [])[0] || (editRecord?.normalized.saveCloseHints || [])[0];

  const createFlow = createRecord ? detectFlow(createRecord.normalized) : null;
  const editFlow = editRecord ? detectFlow(editRecord.normalized) : null;
  const createDetail = createRecord ? extractDetailEdit(createRecord.normalized) : null;
  const editDetail = editRecord ? extractDetailEdit(editRecord.normalized) : null;
  const createCommit = createRecord ? (createRecord.normalized.detailCommitHints || [])[0] : null;
  const editCommit = editRecord ? (editRecord.normalized.detailCommitHints || [])[0] : null;
  const firstFormSelector = hLookups[0]?.ownerSelector || createDetail?.editorSelector || editDetail?.editorSelector || '#body';

  const selectors = [];
  menu.forEach((selector, index) => selectors.push(`  private readonly S_MENU_${index} = '${quote(selector)}';`));
  selectors.push(`  private readonly S_LIST_HEADER = '#ListGrid_R0 > th';`);
  if (createFlow) selectors.push(`  private readonly S_NEW_ACTION = '${quote(createFlow.actionSelector)}';`);
  if (editFlow) {
    selectors.push(`  private readonly S_EDIT_ROW = '${quote(editFlow.rowSelector)}';`);
    selectors.push(`  private readonly S_EDIT_ACTION = '${quote(editFlow.actionSelector)}';`);
  }

  hLookups.forEach((hint) => {
    selectors.push(`  private readonly S_${hint.lookupKey.toUpperCase()}_INPUT = '${quote(hint.ownerSelector)}';`);
    if (hint.lookupButtonSelector) selectors.push(`  private readonly S_${hint.lookupKey.toUpperCase()}_BTN = '${quote(hint.lookupButtonSelector)}';`);
  });

  if (createDetail && createCommit) {
    selectors.push(`  private readonly S_ADDDETAIL_TRIGGER = '${quote(createDetail.triggerSelector)}';`);
    selectors.push(`  private readonly S_ADDDETAIL_EDITOR = '${quote(createDetail.editorSelector)}';`);
    if (createDetail.quantitySelector) selectors.push(`  private readonly S_ADDDETAIL_QTY = '${quote(createDetail.quantitySelector)}';`);
    selectors.push(`  private readonly S_ADDDETAIL_OK = '${quote(createCommit.okButtonSelector)}';`);
    selectors.push(`  private readonly S_ADDDETAIL_ROW = '${quote(createCommit.rowProofSelector)}';`);
  }

  if (editDetail && editCommit) {
    selectors.push(`  private readonly S_EDITDETAILQUANTITY_TRIGGER = '${quote(editDetail.triggerSelector)}';`);
    selectors.push(`  private readonly S_EDITDETAILQUANTITY_EDITOR = '${quote(editDetail.editorSelector)}';`);
    if (editDetail.quantitySelector) selectors.push(`  private readonly S_EDITDETAILQUANTITY_QTY = '${quote(editDetail.quantitySelector)}';`);
    selectors.push(`  private readonly S_EDITDETAILQUANTITY_OK = '${quote(editCommit.okButtonSelector)}';`);
    selectors.push(`  private readonly S_EDITDETAILQUANTITY_ROW = '${quote(editCommit.rowProofSelector)}';`);
  }

  if (save) {
    selectors.push(`  private readonly S_SAVE = '${quote(save.saveButtonSelector)}';`);
    if (save.closeButtonSelector) selectors.push(`  private readonly S_CLOSE = '${quote(save.closeButtonSelector)}';`);
  }

  const lookupMapLines = lookupHints.map((hint) =>
    `    ['${quote(hint.lookupKey)}', { input: '${quote(hint.ownerSelector)}', btn: '${quote(hint.lookupButtonSelector || '')}', value: '${quote(hint.expectedValue)}' }],`
  );

  const menuLines = menu.length
    ? [
        ...menu.slice(0, -1).map((_, index) => `    await this.ensureSubMenuVisible(this.S_MENU_${index}, this.S_MENU_${index + 1});`),
        `    await this.clickVisibleWithFallback(this.S_MENU_${menu.length - 1});`,
        `    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});`,
      ]
    : [`    throw new Error('Menu selector bulunamadi. Recording kontrol edilmeli.');`];

  const fillHeader = hLookups.length
    ? `
  async fillHeaderLookups(): Promise<void> {
${hLookups.map((hint) => `    await this.selectLookupByKey('${quote(hint.lookupKey)}');`).join('\n')}
  }
`
    : '';

  const openNew = createFlow
    ? `
  async openNewRecord(): Promise<void> {
    const popupPromise = this.page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null);
    const frame = await this.resolveListFrame(20000);
    const action = frame.getByRole('cell', { name: /\\bYeni\\b/i }).first();
    await action.waitFor({ state: 'visible', timeout: 10000 });
    await action.click({ force: true }).catch(async () => {
      await frame.locator(this.S_NEW_ACTION).first().click({ force: true });
    });
    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
      this.page = popup;
    } else {
      this.page = this.getActivePage(${regexArrayForPath(formPath)});
    }
    await this.resolveFormFrame(15000);
  }
`
    : '';

  const openEdit = editFlow
    ? `
  async openSelectedRecord(): Promise<void> {
    const popupPromise = this.page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null);
    const frame = await this.resolveListFrame(20000);
    await frame.locator(this.S_EDIT_ROW).first().click({ force: true });
    const action = frame.locator(this.S_EDIT_ACTION).first();
    await action.waitFor({ state: 'visible', timeout: 10000 });
    await action.click({ force: true });
    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
      this.page = popup;
    } else {
      this.page = this.getActivePage(${regexArrayForPath(formPath)});
    }
    await this.resolveFormFrame(15000);
  }
`
    : '';

  const saveBody = save
    ? save.combined
      ? [
          `    const btn = this.page.locator(this.S_SAVE).first();`,
          `    await btn.waitFor({ state: 'visible', timeout: 10000 });`,
          `    await btn.scrollIntoViewIfNeeded().catch(() => {});`,
          `    await btn.hover({ timeout: 2000 }).catch(() => {});`,
          `    for (let attempt = 0; attempt < 4; attempt++) {`,
          `      await btn.click({ force: true });`,
          `      const closed = await this.page.waitForEvent('close', { timeout: 5000 })`,
          `        .then(() => true)`,
          `        .catch(() => false);`,
          `      if (closed || this.page.isClosed()) return;`,
          `    }`,
          `    throw new Error(\`Form kapatilamadi: \${this.S_SAVE}\`);`,
        ]
      : [`    await this.saveAndCloseWithRetry(this.S_SAVE, this.S_CLOSE, 4);`]
    : [`    throw new Error('saveCloseHints bulunamadi. Recording kontrol edilmeli.');`];

  return `import { expect, Frame, Page } from '@playwright/test';
import { BasePage } from '../runtime/BasePage';

/** Otomatik uretildi - ${new Date().toISOString().slice(0, 10)} */
export class ${className} extends BasePage {
  private readonly lookupMap = new Map<string, { input: string; btn: string; value: string }>([
${lookupMapLines.join('\n')}
  ]);

${selectors.join('\n')}

  constructor(page: Page) { super(page); }

  async openList(): Promise<void> {
${menuLines.join('\n')}
  }

  private async resolveListFrame(timeout = 15000): Promise<Frame> {
    this.page = this.getActivePage(${regexArrayForPath(listPath)});
    return this.resolveFrameByAnyVisibleMarker([this.S_LIST_HEADER], timeout, ${regexArrayForPath(listPath)});
  }

  private async resolveFormFrame(timeout = 15000): Promise<Frame> {
    this.page = this.getActivePage(${regexArrayForPath(formPath)});
    return this.resolveFrameByAnyVisibleMarker(['${quote(firstFormSelector)}'], timeout, ${regexArrayForPath(formPath)});
  }
${openNew}${openEdit}${fillHeader}${buildDetailMethod(createRecord, 'addDetail', '100')}${buildDetailMethod(editRecord, 'editDetailQuantity', editDetail?.quantityValue)}
  async fillField(selector: string, value: string): Promise<void> {
    const frame = await this.resolveFormFrame(10000);
    await this.fillRobustInFrame(frame, selector, value);
  }

  async saveAndClose(): Promise<void> {
${saveBody.join('\n')}
  }

  async assertReady(): Promise<void> {
    await this.assertFormClosed();
    const frame = await this.resolveListFrame(15000);
    await expect(frame.locator(this.S_LIST_HEADER).first()).toBeVisible();
  }

  async selectLookupByKey(key: string): Promise<void> {
    const hint = this.lookupMap.get(key);
    if (!hint) throw new Error(\`Lookup bulunamadi: \${key}\`);
    await this.useLookupByValueWithFallback(hint.btn, hint.input, hint.value, 8000);
    const actual = await this.page.locator(hint.input).first().inputValue();
    expect(actual.toLowerCase()).toContain(hint.value.toLowerCase());
  }
}
`;
}

function buildSpec(record, className) {
  const normalized = record.normalized;
  const featureName = toHumanLabel(record.basename);
  const plan = record.plan || buildDeterministicPlan(normalized, { recordingName: record.basename });
  const steps = [];

  for (const operation of plan.operations || []) {
    if (operation.op === 'openList') {
      steps.push(`
    await test.step('Listeyi acar', async () => {
      await erp.openList();
    });`);
    } else if (operation.op === 'openNewRecord') {
      steps.push(`
    await test.step('Yeni kayit baslatir', async () => {
      await erp.openNewRecord();
    });`);
    } else if (operation.op === 'openSelectedRecord') {
      steps.push(`
    await test.step('Kaydi duzenlemeye alir', async () => {
      await erp.openSelectedRecord();
    });`);
    } else if (operation.op === 'selectLookup') {
      steps.push(`
    await test.step('${quote(toHumanLabel(operation.key))} lookup secer', async () => {
      await erp.selectLookupByKey('${quote(operation.key)}');
    });`);
    } else if (operation.op === 'fillField') {
      const label = fieldLabelFromSelector(operation.selector);
      steps.push(`
    await test.step('${quote(label)} alanini doldurur', async () => {
      await erp.fillField('${quote(operation.selector)}', '${quote(operation.value)}');
    });`);
    } else if (operation.op === 'addDetailRow') {
      steps.push(`
    await test.step('Detay satiri ekler', async () => {
      await erp.addDetail('${quote(operation.quantity || '100')}');
    });`);
    } else if (operation.op === 'editDetailQuantity') {
      steps.push(`
    await test.step('Detay miktarini duzenler', async () => {
      await erp.editDetailQuantity('${quote(operation.quantity || '100')}');
    });`);
    } else if (operation.op === 'saveAndClose') {
      steps.push(`
    await test.step('Kaydeder ve kapatir', async () => {
      await erp.saveAndClose();
    });`);
    } else if (operation.op === 'assertReady') {
      steps.push(`
    await test.step('Dogrulama', async () => {
      await erp.assertReady();
    });`);
    }
  }

  return `import { test } from '../fixtures/base.fixture';
import { ${className} } from '../../pages/${className}';

/** Otomatik uretildi - ${new Date().toISOString().slice(0, 10)} */
// Plan: ${record.planPath ? path.relative(ROOT, record.planPath) : 'in-memory deterministic'}
test.describe('${featureName}', () => {
  test('${featureName} akisi', async ({ page }) => {
    test.setTimeout(120000);
    const erp = new ${className}(page);
${steps.join('')}
  });
});
`;
}

function readRecord(normalizedPath) {
  const normalized = JSON.parse(fs.readFileSync(normalizedPath, 'utf8'));
  const existingPlan = readPlanIfExists(normalizedPath);
  const plan = existingPlan || buildDeterministicPlan(normalized, { recordingName: basenameOf(normalizedPath) });
  const validation = validatePlan(plan, normalized);
  if (!validation.ok) {
    throw new Error(`Plan gecersiz (${path.basename(defaultPlanPath(normalizedPath))}): ${validation.errors.join('; ')}`);
  }
  return {
    basename: basenameOf(normalizedPath),
    normalizedPath,
    normalized,
    plan,
    planPath: existingPlan ? defaultPlanPath(normalizedPath) : null,
  };
}

function groupRecords(records) {
  const groups = new Map();
  for (const record of records) {
    const key = pageKeyFor(record.normalized);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  return groups;
}

function buildRegistryEntry(key, records, className) {
  const representative = preferredRecord(records, 'create');
  return {
    pageId: key.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase(),
    className,
    key,
    listUrlPath: extractListUrlPath(representative.normalized),
    formUrlPath: extractFormUrlPath(representative.normalized),
    menuCodes: extractMenuCodes(representative.normalized.steps),
    recordings: records.map((record) => ({
      name: record.basename,
      flow: detectFlow(record.normalized).type,
      planner: record.plan?.planner || 'deterministic',
      planPath: record.planPath ? path.relative(ROOT, record.planPath) : null,
    })),
  };
}

function buildRecordSet(records, outputDir) {
  const pagesDir = path.join(outputDir, 'pages');
  const testsDir = path.join(outputDir, 'tests', 'generated');
  const registryPath = path.join(outputDir, 'builder', 'page-registry.json');
  fs.mkdirSync(pagesDir, { recursive: true });
  fs.mkdirSync(testsDir, { recursive: true });

  cleanGeneratedFiles(pagesDir);
  cleanGeneratedFiles(testsDir);

  const registry = [];
  const groups = groupRecords(records);
  for (const [key, groupRecordsForPage] of groups.entries()) {
    const className = classNameForGroup(groupRecordsForPage);
    const pomPath = path.join(pagesDir, `${className}.ts`);
    fs.writeFileSync(pomPath, buildPOMForGroup(groupRecordsForPage, className), 'utf8');
    registry.push(buildRegistryEntry(key, groupRecordsForPage, className));

    console.log(`OK POM  -> ${path.relative(ROOT, pomPath)} (${groupRecordsForPage.map((r) => r.basename).join(', ')})`);

    for (const record of groupRecordsForPage) {
      const specPath = path.join(testsDir, `${record.basename}.spec.ts`);
      fs.writeFileSync(specPath, buildSpec(record, className), 'utf8');
      console.log(`OK Spec -> ${path.relative(ROOT, specPath)} uses ${className}`);
    }
  }

  fs.writeFileSync(registryPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), pages: registry }, null, 2)}\n`, 'utf8');
  console.log(`OK Registry -> ${path.relative(ROOT, registryPath)}`);
}

function build(normalizedPath, outputDir) {
  buildRecordSet([readRecord(normalizedPath)], outputDir);
}

function buildAll() {
  const recDir = path.join(ROOT, 'recordings');
  const records = fs.readdirSync(recDir)
    .filter((file) => file.endsWith('-normalized.json'))
    .sort()
    .map((file) => readRecord(path.join(recDir, file)));
  buildRecordSet(records, ROOT);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  try {
    if (args[0] === '--all') {
      buildAll();
    } else if (args.length >= 1) {
      build(path.resolve(args[0]), args[1] ? path.resolve(args[1]) : ROOT);
    } else {
      console.log('Kullanim: node builder/code-builder.js <normalized.json> [output-dir]');
      console.log('         node builder/code-builder.js --all');
      process.exit(1);
    }
  } catch (error) {
    console.error(`Hata: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  build,
  buildAll,
  buildPOMForGroup,
  buildSpec,
  detectFlow,
  pageKeyFor,
};
