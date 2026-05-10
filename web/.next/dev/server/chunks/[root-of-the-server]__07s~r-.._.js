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
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

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
"[project]/web/lib/test-runner.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getJob",
    ()=>getJob,
    "startJob",
    ()=>startJob
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/child_process [external] (child_process, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/web/lib/paths.ts [app-route] (ecmascript)");
;
;
;
;
// Module-level job store
const jobs = new Map();
const MAX_JOBS = 20;
function startJob(files, headed) {
    const jobId = `job-${Date.now()}`;
    const job = {
        jobId,
        status: 'running',
        total: files.length,
        headed,
        startedAt: Date.now(),
        results: files.map((f)=>({
                filePath: f,
                name: __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].basename(f),
                status: 'queued',
                durationMs: 0,
                stdout: '',
                stderr: ''
            }))
    };
    // Evict oldest if at capacity
    if (jobs.size >= MAX_JOBS) {
        const oldest = [
            ...jobs.keys()
        ][0];
        jobs.delete(oldest);
    }
    jobs.set(jobId, job);
    runJob(job);
    return jobId;
}
async function runJob(job) {
    for (const result of job.results){
        result.status = 'running';
        const t0 = Date.now();
        try {
            const { stdout, stderr } = await runPlaywright(result.filePath, job.headed);
            result.status = 'success';
            result.stdout = stdout;
            result.stderr = stderr;
        } catch (e) {
            result.status = 'failed';
            const err = e;
            result.stdout = err.stdout || '';
            result.stderr = err.stderr || err.message || 'Bilinmeyen hata';
        }
        result.durationMs = Date.now() - t0;
    }
    job.status = 'done';
}
function runPlaywright(filePath, headed) {
    return new Promise((resolve, reject)=>{
        const absPath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].resolve(filePath);
        const testsDir = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].resolve(__TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TESTS_GENERATED_DIR"]);
        if (!absPath.startsWith(testsDir + __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].sep)) {
            reject(new Error(`Test dosyasi generated klasoru disinda: ${filePath}`));
            return;
        }
        if (!__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(absPath)) {
            reject(new Error(`Test dosyasi bulunamadi: ${filePath}`));
            return;
        }
        const relativeSpec = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].relative(__TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OTOTEST_ROOT"], absPath).replace(/\\/g, '/');
        const pwCli = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OTOTEST_ROOT"], 'node_modules', 'playwright', 'cli.js');
        const args = [
            pwCli,
            'test',
            relativeSpec,
            '--project=chromium'
        ];
        if (headed) args.push('--headed');
        const proc = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__["spawn"])(process.execPath, args, {
            cwd: __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$paths$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OTOTEST_ROOT"],
            env: {
                ...process.env
            },
            windowsHide: false
        });
        let stdout = `Command: node ${args.join(' ')}\n`;
        let stderr = '';
        proc.stdout?.setEncoding('utf8');
        proc.stdout?.on('data', (d)=>{
            stdout += d;
            if (stdout.length > 80000) stdout = stdout.slice(-80000);
        });
        proc.stderr?.setEncoding('utf8');
        proc.stderr?.on('data', (d)=>{
            stderr += d;
            if (stderr.length > 80000) stderr = stderr.slice(-80000);
        });
        proc.on('close', (code)=>{
            if (code === 0) resolve({
                stdout,
                stderr
            });
            else reject(Object.assign(new Error(`exit ${code}`), {
                stdout,
                stderr
            }));
        });
        proc.on('error', (err)=>reject(err));
    });
}
function getJob(jobId) {
    return jobs.get(jobId) ?? null;
}
}),
"[project]/web/app/api/test-files/run/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/web/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$test$2d$runner$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/web/lib/test-runner.ts [app-route] (ecmascript)");
;
;
const dynamic = 'force-dynamic';
async function POST(req) {
    try {
        const body = await req.json();
        const files = Array.isArray(body?.files) ? body.files : [];
        const headed = body?.headed === true;
        if (files.length === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'files zorunludur.'
            }, {
                status: 400
            });
        }
        const jobId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$test$2d$runner$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["startJob"])(files, headed);
        return __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            jobId,
            total: files.length,
            headed
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

//# sourceMappingURL=%5Broot-of-the-server%5D__07s~r-.._.js.map