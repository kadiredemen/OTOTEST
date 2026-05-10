#!/usr/bin/env node
'use strict';

/**
 * Kullanim:
 *   node normalizer/normalize.js recordings/foo.json          → recordings/foo-normalized.json
 *   node normalizer/normalize.js recordings/foo.json out.json → out.json
 *   node normalizer/normalize.js --all                        → tüm recordings/*.json
 */

const path = require('path');
const fs   = require('fs');
const { normalizeRecordingFromFile, writeNormalizedOutput } = require('./normalizeRecording');

const ROOT = path.resolve(__dirname, '..');

function defaultOut(inputPath) {
  const ext = path.extname(inputPath);
  return inputPath.slice(0, -ext.length) + '-normalized.json';
}

function run(inputPath, outputPath) {
  const normalized = normalizeRecordingFromFile(inputPath);
  writeNormalizedOutput(outputPath, normalized);
  const save  = (normalized.saveCloseHints || [])[0];
  const saves = save ? save.saveButtonSelector : '—';
  const close = save?.closeButtonSelector || '(combined)';
  console.log(`✓ ${path.relative(ROOT, outputPath)}  save=${saves}  close=${close}`);
}

const args = process.argv.slice(2);

if (args[0] === '--all') {
  const recDir = path.join(ROOT, 'recordings');
  const files  = fs.readdirSync(recDir)
    .filter(f => f.endsWith('.json') && !f.endsWith('-normalized.json'));
  for (const f of files) {
    const inp = path.join(recDir, f);
    const out = defaultOut(inp);
    try { run(inp, out); } catch (e) { console.error(`✗ ${f}: ${e.message}`); }
  }
} else if (args.length >= 1) {
  const inp = path.resolve(args[0]);
  const out = args[1] ? path.resolve(args[1]) : defaultOut(inp);
  run(inp, out);
} else {
  console.log('Kullanim:');
  console.log('  node normalizer/normalize.js recordings/foo.json');
  console.log('  node normalizer/normalize.js --all');
  process.exit(1);
}
