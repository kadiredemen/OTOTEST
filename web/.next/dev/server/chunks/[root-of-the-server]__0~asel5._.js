module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/child_process [external] (child_process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("child_process", () => require("child_process"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[project]/web/lib/paths.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BUILDER_SCRIPT",
    ()=>BUILDER_SCRIPT,
    "LOGS_DIR",
    ()=>LOGS_DIR,
    "NORMALIZER_SCRIPT",
    ()=>NORMALIZER_SCRIPT,
    "OTOTEST_ROOT",
    ()=>OTOTEST_ROOT,
    "PAGES_DIR",
    ()=>PAGES_DIR,
    "PLANNER_SCRIPT",
    ()=>PLANNER_SCRIPT,
    "RECORDER_SCRIPT",
    ()=>RECORDER_SCRIPT,
    "RECORDINGS_DIR",
    ()=>RECORDINGS_DIR,
    "TESTS_GENERATED_DIR",
    ()=>TESTS_GENERATED_DIR
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
;
const OTOTEST_ROOT = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].resolve(process.cwd(), '..');
const RECORDINGS_DIR = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(OTOTEST_ROOT, 'recordings');
const LOGS_DIR = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(OTOTEST_ROOT, 'logs');
const PAGES_DIR = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(OTOTEST_ROOT, 'pages');
const TESTS_GENERATED_DIR = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(OTOTEST_ROOT, 'tests', 'generated');
const RECORDER_SCRIPT = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(OTOTEST_ROOT, 'recorder.js');
const NORMALIZER_SCRIPT = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(OTOTEST_ROOT, 'normalizer', 'normalize.js');
const PLANNER_SCRIPT = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(OTOTEST_ROOT, 'builder', 'intent-planner.js');
const BUILDER_SCRIPT = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(OTOTEST_ROOT, 'builder', 'code-builder.js');
}),
"[project]/web/app/api/recordings/generate/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/web/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/child_process [external] (child_process, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/web/lib/paths.ts [app-route] (ecmascript)");
;
;
;
;
;
const dynamic = 'force-dynamic';
const AI_ENV_KEYS = new Set([
    'OPENAI_API_KEY',
    'OPENAI_MODEL',
    'GEMINI_API_KEY',
    'GEMINI_MODEL',
    'OTOTEST_AI_PLANNER',
    'OTOTEST_AI_PROVIDER',
    'OTOTEST_AI_MODEL'
]);
function timestampForFile() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}
function safeName(name) {
    return name.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'recording';
}
function appendLog(logPath, line = '') {
    __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].appendFileSync(logPath, `${line}\n`, 'utf8');
}
function loadRootAiEnv() {
    const envPath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OTOTEST_ROOT"], '.env');
    if (!__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(envPath)) return;
    const content = __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)){
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        if (!AI_ENV_KEYS.has(key)) continue;
        let value = trimmed.slice(eq + 1).trim();
        if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1);
        }
        process.env[key] = value;
    }
}
function aiPlannerEnabled() {
    if (process.env.OTOTEST_AI_PLANNER === '0') return false;
    if (process.env.OTOTEST_AI_PLANNER === '1') return true;
    return Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
}
function currentAiProvider() {
    return process.env.OTOTEST_AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'openai');
}
function currentAiModel() {
    return process.env.OTOTEST_AI_MODEL || process.env.GEMINI_MODEL || process.env.OPENAI_MODEL || '(default)';
}
function appendBlock(logPath, title, content) {
    if (!content.trim()) return;
    appendLog(logPath, `--- ${title} ---`);
    appendLog(logPath, content.trimEnd());
}
function displayArg(arg) {
    return __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].isAbsolute(arg) ? __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].relative(__TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OTOTEST_ROOT"], arg) : arg;
}
function runLoggedStep(logPath, label, script, args, timeout) {
    const started = Date.now();
    appendLog(logPath, `[${new Date().toISOString()}] START ${label}`);
    appendLog(logPath, `command=node ${__TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].relative(__TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OTOTEST_ROOT"], script)} ${args.map(displayArg).join(' ')}`);
    try {
        const stdout = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__["execFileSync"])('node', [
            script,
            ...args
        ], {
            cwd: __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OTOTEST_ROOT"],
            timeout,
            encoding: 'utf8',
            windowsHide: true,
            stdio: [
                'ignore',
                'pipe',
                'pipe'
            ]
        });
        const durationMs = Date.now() - started;
        appendBlock(logPath, `${label} stdout`, stdout);
        appendLog(logPath, `[${new Date().toISOString()}] OK ${label} durationMs=${durationMs}`);
        return {
            ok: true,
            durationMs,
            stdout,
            stderr: ''
        };
    } catch (e) {
        const err = e;
        const stdout = Buffer.isBuffer(err.stdout) ? err.stdout.toString('utf8') : String(err.stdout || '');
        const stderr = Buffer.isBuffer(err.stderr) ? err.stderr.toString('utf8') : String(err.stderr || '');
        const durationMs = Date.now() - started;
        appendBlock(logPath, `${label} stdout`, stdout);
        appendBlock(logPath, `${label} stderr`, stderr);
        appendLog(logPath, `[${new Date().toISOString()}] FAIL ${label} durationMs=${durationMs}`);
        appendLog(logPath, `error=${err.message || String(e)}`);
        return {
            ok: false,
            durationMs,
            stdout,
            stderr,
            error: err.message || String(e)
        };
    }
}
function readPlanMeta(planPath) {
    if (!__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(planPath)) return null;
    try {
        const plan = JSON.parse(__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].readFileSync(planPath, 'utf8'));
        return {
            planner: plan.planner || null,
            flow: plan.flow || null,
            operationCount: Array.isArray(plan.operations) ? plan.operations.length : 0,
            operations: Array.isArray(plan.operations) ? plan.operations.map((op)=>op.op).filter(Boolean) : []
        };
    } catch  {
        return null;
    }
}
async function POST(req) {
    try {
        loadRootAiEnv();
        const body = await req.json();
        const names = Array.isArray(body?.testNames) ? body.testNames : body?.testName ? [
            body.testName
        ] : [];
        if (names.length === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'testName veya testNames zorunludur.'
            }, {
                status: 400
            });
        }
        const results = [];
        const generateLogDir = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["LOGS_DIR"], 'generate');
        __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].mkdirSync(generateLogDir, {
            recursive: true
        });
        for (const name of names){
            const logPath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(generateLogDir, `${safeName(name)}-${timestampForFile()}.log`);
            appendLog(logPath, `recording=${name}`);
            appendLog(logPath, `startedAt=${new Date().toISOString()}`);
            appendLog(logPath, `root=${__TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OTOTEST_ROOT"]}`);
            appendLog(logPath, `aiPlanner=${aiPlannerEnabled() ? 'enabled' : 'disabled'}`);
            appendLog(logPath, `aiProvider=${currentAiProvider()}`);
            appendLog(logPath, `aiModel=${currentAiModel()}`);
            const rawPath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["RECORDINGS_DIR"], `${name}.json`);
            if (!__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(rawPath)) {
                appendLog(logPath, 'FAIL raw recording not found');
                results.push({
                    name,
                    ok: false,
                    error: 'Kayıt dosyası bulunamadı.',
                    logPath: __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].relative(__TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OTOTEST_ROOT"], logPath)
                });
                continue;
            }
            // 1) Normalize
            const normalize = runLoggedStep(logPath, 'normalize', __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NORMALIZER_SCRIPT"], [
                rawPath
            ], 15000);
            if (!normalize.ok) {
                results.push({
                    name,
                    ok: false,
                    error: (normalize.error || 'Normalize hatası').slice(0, 300),
                    logPath: __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].relative(__TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OTOTEST_ROOT"], logPath)
                });
                continue;
            }
            // 2) Produce a constrained test intent plan
            const normalizedPath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["RECORDINGS_DIR"], `${name}-normalized.json`);
            const planPath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["RECORDINGS_DIR"], `${name}-plan.json`);
            const plannerArgs = aiPlannerEnabled() ? [
                normalizedPath,
                '--ai'
            ] : [
                normalizedPath
            ];
            const planner = runLoggedStep(logPath, 'planner', __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PLANNER_SCRIPT"], plannerArgs, 30000);
            const planMeta = readPlanMeta(planPath);
            if (planMeta) appendLog(logPath, `planMeta=${JSON.stringify(planMeta)}`);
            if (!planner.ok) {
                results.push({
                    name,
                    ok: false,
                    error: (planner.error || 'Planner hatası').slice(0, 300),
                    logPath: __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].relative(__TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OTOTEST_ROOT"], logPath)
                });
                continue;
            }
            // 3) Build POM + Spec from the validated plan
            const builder = runLoggedStep(logPath, 'builder', __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["BUILDER_SCRIPT"], [
                '--all'
            ], 15000);
            if (!builder.ok) {
                results.push({
                    name,
                    ok: false,
                    error: (builder.error || 'Builder hatası').slice(0, 300),
                    logPath: __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].relative(__TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OTOTEST_ROOT"], logPath)
                });
                continue;
            }
            appendLog(logPath, `finishedAt=${new Date().toISOString()}`);
            results.push({
                name,
                ok: true,
                logPath: __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].relative(__TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OTOTEST_ROOT"], logPath)
            });
        }
        const allOk = results.every((r)=>r.ok);
        return __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            results
        }, {
            status: allOk ? 200 : 207
        });
    } catch (e) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: String(e)
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0~asel5._.js.map