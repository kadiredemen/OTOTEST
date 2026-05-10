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
"[project]/web/lib/recorder-manager.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clearStatus",
    ()=>clearStatus,
    "getStatus",
    ()=>getStatus,
    "startRecording",
    ()=>startRecording,
    "stopRecording",
    ()=>stopRecording
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/child_process [external] (child_process, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/web/lib/paths.ts [app-route] (ecmascript)");
;
;
;
// Module-level singleton — persists across API requests in the same process
let activeProcess = null;
let state = {
    status: 'idle',
    testName: '',
    message: '',
    startedAt: 0,
    outputFile: '',
    lastLines: []
};
function slugify(name) {
    return String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function pushLine(line) {
    state.lastLines = [
        ...state.lastLines.slice(-19),
        line
    ];
}
function startRecording(testName) {
    if (state.status === 'recording') {
        throw new Error('Zaten kayıt devam ediyor.');
    }
    const slug = slugify(testName);
    if (!slug) throw new Error('Geçersiz test adı.');
    const outputFile = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["RECORDINGS_DIR"], `${slug}.json`);
    state = {
        status: 'recording',
        testName: slug,
        message: 'Tarayıcı açılıyor...',
        startedAt: Date.now(),
        outputFile,
        lastLines: []
    };
    activeProcess = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__["spawn"])('node', [
        __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["RECORDER_SCRIPT"],
        `--test-name=${slug}`,
        `--file=${outputFile}`
    ], {
        cwd: __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].dirname(__TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["RECORDER_SCRIPT"]),
        stdio: [
            'pipe',
            'pipe',
            'pipe'
        ],
        detached: false
    });
    activeProcess.stdout?.setEncoding('utf8');
    activeProcess.stdout?.on('data', (chunk)=>{
        for (const line of chunk.split('\n').filter(Boolean)){
            pushLine(line);
            if (state.status === 'recording') state.message = line.slice(0, 120);
        }
    });
    activeProcess.stderr?.setEncoding('utf8');
    activeProcess.stderr?.on('data', (chunk)=>{
        for (const line of chunk.split('\n').filter(Boolean))pushLine('[ERR] ' + line);
    });
    activeProcess.on('close', (code)=>{
        state.status = code === 0 ? 'saved' : 'error';
        state.message = code === 0 ? `Kayıt tamamlandı: ${slug}.json` : `Hata (exit ${code})`;
        activeProcess = null;
    });
    activeProcess.on('error', (err)=>{
        state.status = 'error';
        state.message = err.message;
        activeProcess = null;
    });
    return {
        ok: true,
        testName: slug,
        outputFile
    };
}
function stopRecording() {
    if (!activeProcess || state.status !== 'recording') {
        throw new Error('Aktif kayıt yok.');
    }
    // Windows: stdin üzerinden STOP komutu
    try {
        activeProcess.stdin?.write('STOP\n');
        activeProcess.stdin?.end();
    } catch  {
        activeProcess.kill('SIGTERM');
    }
    return {
        ok: true
    };
}
function clearStatus() {
    if (state.status === 'recording') throw new Error('Kayıt devam ediyor, önce durdurun.');
    state = {
        status: 'idle',
        testName: '',
        message: '',
        startedAt: 0,
        outputFile: '',
        lastLines: []
    };
    return {
        ok: true
    };
}
function getStatus() {
    return {
        ...state
    };
}
}),
"[project]/web/app/api/recordings/start/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/web/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$recorder$2d$manager$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/web/lib/recorder-manager.ts [app-route] (ecmascript)");
;
;
const dynamic = 'force-dynamic';
async function POST(req) {
    try {
        const body = await req.json();
        const testName = String(body?.testName || '').trim();
        if (!testName) return __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Test adı zorunludur.'
        }, {
            status: 400
        });
        const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$recorder$2d$manager$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["startRecording"])(testName);
        return __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(result, {
            status: 202
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: msg
        }, {
            status: 409
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__00sgo.6._.js.map