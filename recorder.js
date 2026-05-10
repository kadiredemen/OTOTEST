/**
 * Univera ERP - Playwright Recorder
 * Handles: nested iframes, popups, new windows, dialogs, dynamic content,
 *          double-click, F-keys, Ctrl shortcuts, hover, scroll, clipboard,
 *          network, error messages, page title tracking
 * Smart filtering: deduplication, throttle, noise reduction
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const TARGET_URL = 'https://testotomasyon.univera.com.tr:8350/';
const fileArg = process.argv.find(a => a.startsWith('--file='));
const testArg = process.argv.find(a => a.startsWith('--test=') || a.startsWith('--test-name=') || a.startsWith('--name='));
const NO_NETWORK = process.argv.includes('--no-network');
const RECORDINGS_DIR = path.join(__dirname, 'recordings');

function slugify(name) {
    return String(name || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function buildOutputFile() {
    if (fileArg) {
        const raw = fileArg.split('=')[1];
        if (raw.includes('\\') || raw.includes('/')) return path.isAbsolute(raw) ? raw : path.join(__dirname, raw);
        return path.join(RECORDINGS_DIR, raw);
    }

    const rawTestName = testArg ? testArg.split('=')[1] : '';
    const safeName = slugify(rawTestName) || `recording-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    return path.join(RECORDINGS_DIR, `${safeName}.json`);
}

const OUTPUT_FILE = buildOutputFile();
const SCHEMA_VERSION = '1.0';

const actions = [];
let actionIndex = 0;
let windowIndex = 0;
const windowRegistry = new Map();
const NETWORK_URL_WHITELIST = [
    /\/Interface\/Erc\//i,
    /\/Interface\/Lists\//i,
    /\/Interface\/Anamenu\/LayoutComponents\/Comminication\//i
];

function log(msg) {
    const time = new Date().toTimeString().slice(0, 8);
    console.log(`[${time}] ${msg}`);
}

function isWhitelistedBusinessApi(url) {
    return NETWORK_URL_WHITELIST.some((pattern) => pattern.test(url));
}

function buildSelectors(action) {
    if (action.selectors && typeof action.selectors === 'object') {
        return action.selectors;
    }

    const selectors = {};
    if (typeof action.selector === 'string' && action.selector.trim()) {
        selectors.primary = action.selector;
    }
    if (action.allSelectors && typeof action.allSelectors === 'object') {
        Object.assign(selectors, action.allSelectors);
    }
    if (typeof action.xpath === 'string' && action.xpath.trim() && !selectors.xpath) {
        selectors.xpath = action.xpath;
    }

    return Object.keys(selectors).length > 0 ? selectors : undefined;
}

function normalizeActionV1(action) {
    const normalized = {
        ...action,
        actionType: action.actionType || action.type,
        frameChain: action.frameChain || 'main',
        windowLabel: action.windowLabel || 'main'
    };

    const selectors = buildSelectors(action);
    if (selectors) {
        normalized.selectors = selectors;
    }

    return normalized;
}

// ─── Inject Script (browser context) ─────────────────────────────────────────
const INJECT_SCRIPT = `
(function() {
    if (window.__recorderInjected) return;
    window.__recorderInjected = true;
    window.__recordedActions = window.__recordedActions || [];

    // ── Helpers ────────────────────────────────────────────────────────────
    function getFrameChain() {
        const chain = [];
        let w = window;
        while (w !== w.parent) {
            try { chain.unshift(w.frameElement ? (w.frameElement.id || w.frameElement.name || 'frame') : 'frame'); }
            catch(e) { chain.unshift('cross-origin'); break; }
            w = w.parent;
        }
        return chain.length ? chain.join(' > ') : 'main';
    }

    // Tüm data-* attribute'larını topla
    function getAllDataAttrs(el) {
        const result = {};
        if (!el.attributes) return result;
        for (let i = 0; i < el.attributes.length; i++) {
            const attr = el.attributes[i];
            if (attr.name.startsWith('data-') || attr.name.startsWith('aria-')) {
                result[attr.name] = attr.value;
            }
        }
        return result;
    }

    // Sayfada kaç tane bu selector var? (uniqueness kontrolü)
    function countMatches(selector) {
        try { return document.querySelectorAll(selector).length; } catch(e) { return 99; }
    }

    // Unique CSS path oluştur (parent chain ile)
    function getUniqueCSSPath(el) {
        const parts = [];
        let node = el;
        while (node && node.nodeType === 1 && node.tagName !== 'BODY' && node.tagName !== 'HTML') {
            let part = node.tagName.toLowerCase();
            if (node.id) { part = '#' + node.id; parts.unshift(part); break; }
            // Sabit data attribute varsa kullan
            const stableData = ['data-menu-kod','data-id','data-key','data-kod','data-value','data-name'];
            let foundData = false;
            for (const d of stableData) {
                const v = node.getAttribute(d);
                if (v) { part = node.tagName.toLowerCase() + '[' + d + '="' + v + '"]'; foundData = true; break; }
            }
            if (!foundData) {
                // nth-child ile disambiguate et
                let idx = 1, sib = node.previousElementSibling;
                while (sib) { if (sib.tagName === node.tagName) idx++; sib = sib.previousElementSibling; }
                if (idx > 1) part += ':nth-of-type(' + idx + ')';
            }
            parts.unshift(part);
            node = node.parentElement;
            // Unique mi? erken çık
            if (parts.length > 1 && countMatches(parts.join(' > ')) === 1) break;
        }
        return parts.join(' > ');
    }

    // Tüm selector stratejilerini üret, en iyi (en kısa & unique) olanı seç
    function buildSelectors(el) {
        const candidates = [];
        const tag = el.tagName ? el.tagName.toLowerCase() : '';

        if (el.id) candidates.push({ sel: '#' + el.id, score: 10 });
        if (el.getAttribute('name')) candidates.push({ sel: tag + '[name="' + el.getAttribute('name') + '"]', score: 9 });

        // data-menu-kod gibi sabit data attribute'lar
        const stableData = ['data-menu-kod','data-id','data-key','data-kod','data-value','data-name','data-field','data-column'];
        for (const d of stableData) {
            const v = el.getAttribute(d);
            if (v) candidates.push({ sel: '[' + d + '="' + v + '"]', score: 8 });
        }

        if (el.getAttribute('aria-label')) candidates.push({ sel: '[aria-label="' + el.getAttribute('aria-label') + '"]', score: 7 });
        if (el.getAttribute('placeholder')) candidates.push({ sel: '[placeholder="' + el.getAttribute('placeholder') + '"]', score: 7 });
        if (el.title) candidates.push({ sel: tag + '[title="' + el.title + '"]', score: 6 });

        // Metin bazlı (input/password hariç)
        const txt = (el.innerText || '').trim().slice(0, 60);
        if (txt && !['INPUT','TEXTAREA'].includes(el.tagName))
            candidates.push({ sel: tag + ':has-text("' + txt.replace(/"/g,'\\\\"') + '")', score: 4 });

        // Unique CSS path
        const cssPath = getUniqueCSSPath(el);
        if (cssPath) candidates.push({ sel: cssPath, score: 5 });

        // En iyi ve unique olanı seç
        candidates.sort((a, b) => b.score - a.score);
        for (const c of candidates) {
            if (countMatches(c.sel) === 1) return c.sel;
        }
        // Unique bulunamazsa en yüksek skorlu
        return candidates.length ? candidates[0].sel : tag;
    }

    function getXPath(el) {
        if (el.id) return '//*[@id="' + el.id + '"]';
        const parts = []; let node = el;
        while (node && node.nodeType === 1) {
            let idx = 1, sib = node.previousSibling;
            while (sib) { if (sib.nodeType === 1 && sib.tagName === node.tagName) idx++; sib = sib.previousSibling; }
            parts.unshift(node.tagName.toLowerCase() + '[' + idx + ']');
            node = node.parentNode;
        }
        return '/' + parts.join('/');
    }

    function getElementInfo(el) {
        const dataAttrs = getAllDataAttrs(el);
        const selector = buildSelectors(el);
        // Tüm selector alternatiflerini de kaydet
        const allSelectors = {};
        if (el.id) allSelectors.id = '#' + el.id;
        if (el.getAttribute('name')) allSelectors.name = '[name="' + el.getAttribute('name') + '"]';
        if (el.title) allSelectors.title = el.tagName.toLowerCase() + '[title="' + el.title + '"]';
        if (el.getAttribute('aria-label')) allSelectors.ariaLabel = '[aria-label="' + el.getAttribute('aria-label') + '"]';
        if (el.getAttribute('placeholder')) allSelectors.placeholder = '[placeholder="' + el.getAttribute('placeholder') + '"]';
        for (const [k,v] of Object.entries(dataAttrs)) {
            if (k.startsWith('data-')) allSelectors[k] = '[' + k + '="' + v + '"]';
        }
        allSelectors.cssPath = getUniqueCSSPath(el);
        allSelectors.xpath = getXPath(el);

        return {
            tag: el.tagName || null,
            id: el.id || null,
            name: el.getAttribute ? el.getAttribute('name') : null,
            inputType: el.getAttribute ? el.getAttribute('type') : null,
            placeholder: el.getAttribute ? el.getAttribute('placeholder') : null,
            ariaLabel: el.getAttribute ? el.getAttribute('aria-label') : null,
            title: el.title || null,
            text: (el.innerText || '').trim().slice(0, 80),
            href: el.href || null,
            dataAttrs,
            selector,          // en iyi & unique selector
            allSelectors,      // tüm alternatifler
            xpath: getXPath(el),
            frameChain: getFrameChain(),
            url: window.location.href,
            windowName: window.name || 'main',
            timestamp: Date.now()
        };
    }

    // Lookup ikonlarinda event hedefi bazen IMG olur.
    // Bu durumda ana tetikleyici elemani (örn: *_TE_b0, *_NE_b0) kaydetmek daha stabildir.
    function resolveActionElement(el) {
        if (!el || !el.closest) return el;
        let node = el;
        while (node && node !== document.body) {
            if (node.id && /_[A-Za-z]{2}_b\d+$/i.test(node.id)) return node;
            node = node.parentElement;
        }
        return el;
    }

    // ── Deduplication ──────────────────────────────────────────────────────
    let lastKey = '';
    let lastTime = 0;

    function isDuplicate(type, selector, value) {
        const key = type + '|' + selector + '|' + (value || '');
        const now = Date.now();
        if (key === lastKey && (now - lastTime) < 300) return true;
        lastKey = key;
        lastTime = now;
        return false;
    }

    // pushDirect: __pushRecordedAction (exposeFunction) varsa real-time gönder,
    // yoksa (cross-origin frame) polling buffer'a yaz.
    function pushDirect(info) {
        if (typeof window.__pushRecordedAction === 'function') {
            window.__pushRecordedAction(info);
        } else {
            window.__recordedActions.push(info);
        }
    }

    function push(info) {
        if (isDuplicate(info.type, info.selector, info.value)) return;
        pushDirect(info);
    }

    // ── Click ──────────────────────────────────────────────────────────────
    document.addEventListener('click', function(e) {
        if (e.detail > 1) return; // double-click handles this
        const el = resolveActionElement(e.target);
        const info = getElementInfo(el);
        info.type = 'click';
        push(info);
    }, true);

    // Bazı ERP rehberlerinde popup mousedown/pointerdown ile açılır; click hiç düşmeyebilir.
    // Sadece lookup trigger elemanlarında bunu click olarak kaydet.
    function recordLookupPointerAsClick(target) {
        const el = resolveActionElement(target);
        if (!el || !el.id || !/_TE_b\\d+$/i.test(el.id)) return;
        const info = getElementInfo(el);
        info.type = 'click';
        push(info);
    }
    document.addEventListener('mousedown', function(e) {
        recordLookupPointerAsClick(e.target);
    }, true);
    document.addEventListener('pointerdown', function(e) {
        recordLookupPointerAsClick(e.target);
    }, true);

    // ── Double Click ───────────────────────────────────────────────────────
    document.addEventListener('dblclick', function(e) {
        const el = resolveActionElement(e.target);
        const info = getElementInfo(el);
        info.type = 'dblclick';
        push(info);
    }, true);

    // ── Right Click ────────────────────────────────────────────────────────
    document.addEventListener('contextmenu', function(e) {
        const el = resolveActionElement(e.target);
        const info = getElementInfo(el);
        info.type = 'rightclick';
        push(info);
    }, true);

    // ── Fill / Select ──────────────────────────────────────────────────────
    document.addEventListener('change', function(e) {
        const el = e.target;
        if (!['INPUT','SELECT','TEXTAREA'].includes(el.tagName)) return;
        const info = getElementInfo(el);
        info.type = el.tagName === 'SELECT' ? 'select' : 'fill';
        info.value = el.type === 'password' ? '***' : (el.value || '');
        if (el.tagName === 'SELECT') {
            const opt = el.options[el.selectedIndex];
            info.selectedText = opt ? opt.text : '';
        }
        if (el.type === 'checkbox' || el.type === 'radio') {
            info.type = 'check';
            info.checked = el.checked;
            info.value = el.value;
        }
        push(info);
    }, true);

    // ── Keyboard ───────────────────────────────────────────────────────────
    const TRACKED_KEYS = ['Enter','Tab','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12','Escape'];
    const TRACKED_CTRL = ['s','z','y','a','c','v','p','f'];

    document.addEventListener('keydown', function(e) {
        const el = e.target;
        const isCtrl = e.ctrlKey || e.metaKey;

        if (isCtrl && TRACKED_CTRL.includes(e.key.toLowerCase())) {
            const info = getElementInfo(el);
            info.type = 'shortcut';
            info.key = 'Ctrl+' + e.key.toUpperCase();
            push(info);
            return;
        }

        if (TRACKED_KEYS.includes(e.key)) {
            const info = getElementInfo(el);
            info.type = 'keypress';
            info.key = e.key;
            info.value = ['INPUT','TEXTAREA'].includes(el.tagName)
                ? (el.type === 'password' ? '***' : el.value)
                : null;
            push(info);
        }
    }, true);

    // ── Blur (field'dan çıkış) ─────────────────────────────────────────────
    document.addEventListener('focusout', function(e) {
        const el = e.target;
        if (!['INPUT','SELECT','TEXTAREA'].includes(el.tagName)) return;
        const val = el.type === 'password' ? '***' : (el.value || '');
        if (!val) return;
        const info = getElementInfo(el);
        info.type = 'blur';
        info.value = val;
        push(info);
    }, true);

    // ── Focus ──────────────────────────────────────────────────────────────
    document.addEventListener('focusin', function(e) {
        const el = e.target;
        if (!['INPUT','SELECT','TEXTAREA'].includes(el.tagName)) return;
        const info = getElementInfo(el);
        info.type = 'focus';
        push(info);
    }, true);

    // ── Hover (sadece buton/link/anlamlı elementler) ───────────────────────
    const HOVER_TAGS = ['BUTTON','A','LI','TD','TR'];
    let hoverTimer = null;
    document.addEventListener('mouseover', function(e) {
        const el = e.target;
        if (!HOVER_TAGS.includes(el.tagName)) return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function() {
            const info = getElementInfo(el);
            info.type = 'hover';
            push(info);
        }, 800); // sadece 800ms+ beklenen hover'ları yakala
    }, true);

    document.addEventListener('mouseout', function() {
        clearTimeout(hoverTimer);
    }, true);

    // ── Scroll (throttled, sadece anlamlı scroll'lar) ─────────────────────
    let scrollTimer = null;
    document.addEventListener('scroll', function(e) {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(function() {
            const el = e.target === document ? document.documentElement : e.target;
            const scrollTop = el.scrollTop || window.scrollY || 0;
            if (scrollTop < 50) return; // üste scroll'u kaydetme
            pushDirect({
                type: 'scroll',
                selector: el.id ? '#' + el.id : el.tagName ? el.tagName.toLowerCase() : 'window',
                scrollTop: Math.round(scrollTop),
                scrollLeft: Math.round(el.scrollLeft || window.scrollX || 0),
                frameChain: getFrameChain(),
                url: window.location.href,
                windowName: window.name || 'main',
                timestamp: Date.now()
            });
        }, 500);
    }, true);

    // ── Clipboard ──────────────────────────────────────────────────────────
    document.addEventListener('paste', function(e) {
        const el = e.target;
        if (!['INPUT','TEXTAREA'].includes(el.tagName)) return;
        const info = getElementInfo(el);
        info.type = 'paste';
        const clipData = e.clipboardData ? e.clipboardData.getData('text') : '';
        info.value = clipData.slice(0, 200);
        push(info);
    }, true);

    // ── Error / Validation mesajları ───────────────────────────────────────
    const errorObserver = new MutationObserver(function(mutations) {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (!node.innerText) continue;
                const text = node.innerText.trim();
                if (!text || text.length < 3) continue;
                const cls = (node.className || '').toLowerCase();
                const isError = cls.includes('error') || cls.includes('alert') ||
                    cls.includes('warning') || cls.includes('toast') ||
                    cls.includes('message') || cls.includes('notification') ||
                    cls.includes('validation') || node.getAttribute && node.getAttribute('role') === 'alert';
                if (isError) {
                    pushDirect({
                        type: 'error_message',
                        text: text.slice(0, 200),
                        selector: buildSelectors(node),
                        frameChain: getFrameChain(),
                        url: window.location.href,
                        windowName: window.name || 'main',
                        timestamp: Date.now()
                    });
                }
            }
        }
    });
    errorObserver.observe(document.documentElement, { childList: true, subtree: true });

    // ── Sayfa başlığı değişimi ─────────────────────────────────────────────
    let lastTitle = document.title;
    const titleObserver = new MutationObserver(function() {
        if (document.title !== lastTitle) {
            pushDirect({
                type: 'title_change',
                from: lastTitle,
                to: document.title,
                frameChain: getFrameChain(),
                url: window.location.href,
                windowName: window.name || 'main',
                timestamp: Date.now()
            });
            lastTitle = document.title;
        }
    });
    const titleEl = document.querySelector('title');
    if (titleEl) titleObserver.observe(titleEl, { childList: true });

    // ── Dinamik iframe takibi ──────────────────────────────────────────────
    const frameObserver = new MutationObserver(function(mutations) {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node.tagName === 'IFRAME' || node.tagName === 'FRAME') {
                    window.__newFrameDetected = true;
                }
            }
        }
    });
    frameObserver.observe(document.documentElement, { childList: true, subtree: true });

    console.log('[RECORDER] injected → ' + getFrameChain() + ' | ' + window.location.href);
})();
`;

// ─── Node.js helpers ──────────────────────────────────────────────────────────

async function injectIntoAllFrames(page) {
    for (const frame of page.frames()) {
        try { await frame.evaluate(INJECT_SCRIPT); } catch (e) {}
    }
}

async function collectFromAllFrames(page, windowLabel) {
    for (const frame of page.frames()) {
        try {
            const collected = await frame.evaluate(() => {
                const items = window.__recordedActions || [];
                window.__recordedActions = [];
                return items;
            });
            for (const action of collected) {
                action.windowLabel = windowLabel;
                action.index = ++actionIndex;
                const frameInfo = action.frameChain !== 'main' ? ` [${action.frameChain}]` : '';
                const val = action.value ? ` = "${action.value}"` : (action.key ? ` [${action.key}]` : '');
                log(`#${action.index} [${windowLabel}]${frameInfo} ${action.type.toUpperCase()} → ${action.selector || action.url || ''}${val}`);
                actions.push(action);
            }
        } catch (e) {}
    }
}

function attachPageListeners(p, label, parentLabel) {
    windowRegistry.set(p, { label, parentLabel, url: p.url() });
    log(`▶ [${label}] açıldı${parentLabel ? ' ← [' + parentLabel + ']' : ''}`);

    // Real-time push: inject script'teki her aksiyon navigate öncesi Node.js'e ulaşır.
    // Bu sayede şifre alanı gibi form-submit ile navigate olan durumlar kaybolmaz.
    p.exposeFunction('__pushRecordedAction', (action) => {
        action.windowLabel = label;
        action.index = ++actionIndex;
        const frameInfo = action.frameChain !== 'main' ? ` [${action.frameChain}]` : '';
        const val = action.value ? ` = "${action.value}"` : (action.key ? ` [${action.key}]` : '');
        log(`#${action.index} [${label}]${frameInfo} ${action.type.toUpperCase()} → ${action.selector || action.url || ''}${val}`);
        actions.push(action);
    }).catch(() => {}); // popup'lar için yeniden expose edilirse hata yut

    p.on('load', async () => {
        await collectFromAllFrames(p, label);
        await injectIntoAllFrames(p);
    });
    p.on('framenavigated', async (f) => { try { await f.evaluate(INJECT_SCRIPT); } catch(e){} });
    p.on('frameattached', async (f) => {
        try { await f.waitForLoadState('load').catch(()=>{}); await f.evaluate(INJECT_SCRIPT); } catch(e){}
    });

    p.on('dialog', async (dialog) => {
        const info = { type: 'dialog', dialogType: dialog.type(), message: dialog.message(),
            windowLabel: label, index: ++actionIndex, url: p.url(), timestamp: Date.now() };
        log(`#${info.index} [${label}] DIALOG (${dialog.type()}) → "${dialog.message()}"`);
        actions.push(info);
        await dialog.accept().catch(()=>{});
    });

    p.on('framenavigated', async (frame) => {
        if (frame !== p.mainFrame()) return;
        const reg = windowRegistry.get(p);
        if (!reg || reg.url === p.url()) return;
        reg.url = p.url();
        const nav = { type: 'navigation', url: p.url(), windowLabel: label,
            index: ++actionIndex, timestamp: Date.now() };
        log(`#${nav.index} [${label}] NAVIGATE → ${p.url()}`);
        actions.push(nav);
    });

    // Network: sadece XHR/fetch isteklerini kaydet (statik dosyaları değil)
    p.on('request', (req) => {
        if (NO_NETWORK) return;
        if (!['xhr','fetch'].includes(req.resourceType())) return;
        if (!isWhitelistedBusinessApi(req.url())) return;
        const net = { type: 'network_request', method: req.method(), url: req.url(),
            windowLabel: label, index: ++actionIndex, timestamp: Date.now() };
        actions.push(net);
    });

    p.on('close', () => {
        log(`◀ [${label}] kapandı`);
        windowRegistry.delete(p);
    });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    log('═══════════════════════════════════════════');
    log(' Univera ERP Recorder — Full Coverage');
    log(`  URL    : ${TARGET_URL}`);
    log(`  Çıktı  : ${OUTPUT_FILE}`);
    log('  Klasör : recordings/');
    log('───────────────────────────────────────────');
    log(' Tüm etkileşimler izleniyor:');
    log(' click · dblclick · rightclick · fill · select');
    log(' check · keypress · shortcut · blur · focus');
    log(' hover · scroll · paste · dialog · navigation');
    log(' error_message · title_change · network_request');
    log(' popup · new window · nested iframe');
    log('───────────────────────────────────────────');
    log(' Bitince Ctrl+C ile kaydedin.');
    log('═══════════════════════════════════════════');

    const portArg = process.argv.find(a => a.startsWith('--port='));
    const port = portArg ? portArg.split('=')[1] : null;
    
    let browser;
    if (port) {
        log(`Connecting to existing browser on port ${port}...`);
        browser = await chromium.connectOverCDP(`http://localhost:${port}`);
    } else {
        browser = await chromium.launch({
            headless: false,
            args: ['--start-maximized','--ignore-certificate-errors',
                   '--disable-web-security','--disable-popup-blocking',
                   '--remote-debugging-port=9222']
        });
    }

    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: null });

    context.on('page', async (newPage) => {
        windowIndex++;
        const parentLabel = [...windowRegistry.entries()]
            .find(([p]) => !p.isClosed())?.[1]?.label || 'main';
        attachPageListeners(newPage, `popup-${windowIndex}`, parentLabel);
        await newPage.waitForLoadState('load').catch(()=>{});
        await injectIntoAllFrames(newPage);
    });

    const mainPage = await context.newPage();
    attachPageListeners(mainPage, 'main', null);

    const pollInterval = setInterval(async () => {
        for (const [p, reg] of windowRegistry.entries()) {
            if (!p.isClosed()) {
                await collectFromAllFrames(p, reg.label);
                await injectIntoAllFrames(p);
            } else {
                windowRegistry.delete(p);
            }
        }
    }, 800);

    let saving = false;
    async function saveAndExit() {
        if (saving) return;
        saving = true;
        clearInterval(pollInterval);
        for (const [p, reg] of windowRegistry.entries()) {
            if (!p.isClosed()) await collectFromAllFrames(p, reg.label);
        }

        // JSON'u aksiyon tiplerine göre grupla (okumayı kolaylaştır)
        const grouped = {};
        for (const a of actions) {
            if (!grouped[a.type]) grouped[a.type] = [];
            grouped[a.type].push(a);
        }

        const summary = Object.entries(grouped)
            .map(([t, arr]) => `${t}: ${arr.length}`)
            .join(', ');

        const output = {
            schemaVersion: SCHEMA_VERSION,
            targetUrl: TARGET_URL,
            recordedAt: new Date().toISOString(),
            totalActions: actions.length,
            summary,
            windows: [...new Set(actions.map(a => a.windowLabel))],
            actions: actions.map((a) => normalizeActionV1(a))
        };

        fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
        log('───────────────────────────────────────────');
        log(`✓ ${actions.length} aksiyon kaydedildi`);
        log(`  Özet: ${summary}`);
        log(`  Dosya: ${OUTPUT_FILE}`);
        await browser.close();
        process.exit(0);
    }

    process.on('SIGINT', saveAndExit);

    // Windows'ta web sunucusu stdin üzerinden STOP komutu gönderebilir
    if (process.stdin.readable) {
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => {
            if (chunk.trim() === 'STOP') {
                log('STOP komutu alındı, kayıt durduruluyor...');
                saveAndExit();
            }
        });
    }

    await mainPage.goto(TARGET_URL, { waitUntil: 'load', timeout: 60000 });
    await injectIntoAllFrames(mainPage);

    await new Promise(() => {});
}

main().catch(err => {
    console.error('[RECORDER ERROR]', err);
    process.exit(1);
});
