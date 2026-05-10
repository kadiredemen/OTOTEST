import path from 'path';

// web/ is inside OTOTEST/, so go one level up from cwd
export const OTOTEST_ROOT = path.resolve(process.cwd(), '..');
export const RECORDINGS_DIR = path.join(OTOTEST_ROOT, 'recordings');
export const LOGS_DIR = path.join(OTOTEST_ROOT, 'logs');
export const PAGES_DIR = path.join(OTOTEST_ROOT, 'pages');
export const TESTS_GENERATED_DIR = path.join(OTOTEST_ROOT, 'tests', 'generated');
export const RECORDER_SCRIPT = path.join(OTOTEST_ROOT, 'recorder.js');
export const NORMALIZER_SCRIPT = path.join(OTOTEST_ROOT, 'normalizer', 'normalize.js');
export const PLANNER_SCRIPT = path.join(OTOTEST_ROOT, 'builder', 'intent-planner.js');
export const BUILDER_SCRIPT = path.join(OTOTEST_ROOT, 'builder', 'code-builder.js');
