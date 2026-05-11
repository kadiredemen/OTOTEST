const fs = require('fs');
const path = require('path');

const ACTION_ALLOWLIST = new Set([
    'navigation',
    'click',
    'dblclick',
    'rightclick',
    'fill',
    'select',
    'check',
    'keypress',
    'shortcut',
    'hover',
    'scroll',
    'paste',
    'dialog',
    'error_message',
    'title_change',
    'network_request',
    'blur',
    'focus'
]);

function stableActionSort(a, b) {
    const tsA = Number.isFinite(a.timestamp) ? a.timestamp : Number.MAX_SAFE_INTEGER;
    const tsB = Number.isFinite(b.timestamp) ? b.timestamp : Number.MAX_SAFE_INTEGER;
    if (tsA !== tsB) return tsA - tsB;

    const idxA = Number.isFinite(a.index) ? a.index : Number.MAX_SAFE_INTEGER;
    const idxB = Number.isFinite(b.index) ? b.index : Number.MAX_SAFE_INTEGER;
    if (idxA !== idxB) return idxA - idxB;

    return (a.__sourceOrder || 0) - (b.__sourceOrder || 0);
}

function sanitizeAction(raw, sourceOrder) {
    const actionType = raw.actionType || raw.type;
    if (!actionType || !ACTION_ALLOWLIST.has(actionType)) return null;

    const base = {
        actionType,
        timestamp: Number.isFinite(raw.timestamp) ? raw.timestamp : null,
        windowLabel: raw.windowLabel || 'main',
        frameChain: raw.frameChain || 'main',
        index: Number.isFinite(raw.index) ? raw.index : null,
        url: raw.url || null,
        __sourceOrder: sourceOrder
    };

    if (typeof raw.value === 'string') base.value = raw.value;
    if (typeof raw.key === 'string') base.key = raw.key;
    if (typeof raw.method === 'string') base.method = raw.method;
    if (typeof raw.postData === 'string') base.postData = raw.postData.slice(0, 20000);
    if (typeof raw.message === 'string') base.message = raw.message;
    if (typeof raw.dialogType === 'string') base.dialogType = raw.dialogType;
    if (typeof raw.from === 'string') base.from = raw.from;
    if (typeof raw.to === 'string') base.to = raw.to;
    if (typeof raw.scrollTop === 'number') base.scrollTop = raw.scrollTop;
    if (typeof raw.scrollLeft === 'number') base.scrollLeft = raw.scrollLeft;

    const selectors = buildSelectorCandidates(raw);
    if (selectors.length > 0) {
        base.selectorCandidates = selectors;
        base.selector = selectors[0].value;
        base.selectorSource = selectors[0].source;
        base.selectorScore = selectors[0].score;
    }

    return base;
}

function buildSelectorCandidates(action) {
    const candidates = [];
    const pushCandidate = (source, value) => {
        if (typeof value !== 'string' || !value.trim()) return;
        candidates.push({
            source,
            value: value.trim(),
            score: selectorScore(source, value.trim())
        });
    };

    if (action.selectors && typeof action.selectors === 'object') {
        for (const [source, value] of Object.entries(action.selectors)) {
            pushCandidate(source, value);
        }
    }

    pushCandidate('primary', action.selector);
    pushCandidate('xpath', action.xpath);

    const uniqueByValue = new Map();
    for (const item of candidates) {
        const existing = uniqueByValue.get(item.value);
        if (!existing || item.score > existing.score) uniqueByValue.set(item.value, item);
    }

    return [...uniqueByValue.values()]
        .sort((a, b) => b.score - a.score || a.source.localeCompare(b.source) || a.value.localeCompare(b.value));
}

function selectorScore(source, value) {
    const normalizedSource = String(source || '').toLowerCase();

    if (normalizedSource === 'id' || value.startsWith('#')) return 100;
    if (normalizedSource.startsWith('data-') || value.includes('[data-')) return 90;
    if (normalizedSource.includes('aria') || value.includes('[aria-')) return 85;
    if (normalizedSource === 'name' || value.includes('[name=')) return 80;
    if (normalizedSource === 'csspath' || normalizedSource === 'primary') return 60;
    if (normalizedSource === 'xpath' || value.startsWith('/') || value.startsWith('xpath=')) return 40;
    return 55;
}

function isSameTarget(a, b) {
    return (
        (a.selector || '') === (b.selector || '') &&
        a.windowLabel === b.windowLabel &&
        a.frameChain === b.frameChain
    );
}

function dropNoise(actions) {
    const output = [];

    for (const action of actions) {
        const prev = output[output.length - 1];
        if (!prev) {
            output.push(action);
            continue;
        }

        const delta = (action.timestamp ?? Number.MAX_SAFE_INTEGER) - (prev.timestamp ?? Number.MAX_SAFE_INTEGER);
        const sameTarget = isSameTarget(action, prev);

        // Rule 1: duplicate collapse.
        if (
            action.actionType !== 'network_request' &&
            sameTarget &&
            action.actionType === prev.actionType &&
            (action.value || '') === (prev.value || '') &&
            (action.key || '') === (prev.key || '') &&
            delta >= 0 &&
            delta <= 500
        ) {
            continue;
        }

        // Rule 2: drop focus right before fill/select/check on same target.
        if (
            prev.actionType === 'focus' &&
            ['fill', 'select', 'check', 'paste'].includes(action.actionType) &&
            sameTarget &&
            delta >= 0 &&
            delta <= 1500
        ) {
            output.pop();
            output.push(action);
            continue;
        }

        // Rule 3: drop click immediately before fill/select/check on same target.
        if (
            prev.actionType === 'click' &&
            ['fill', 'select', 'check', 'paste'].includes(action.actionType) &&
            sameTarget &&
            delta >= 0 &&
            delta <= 1200
        ) {
            output.pop();
            output.push(action);
            continue;
        }

        // Rule 4: blur after identical fill value is mostly noise.
        if (
            action.actionType === 'blur' &&
            prev.actionType === 'fill' &&
            sameTarget &&
            (action.value || '') === (prev.value || '') &&
            delta >= 0 &&
            delta <= 1800
        ) {
            continue;
        }

        output.push(action);
    }

    return output;
}

function toDslSteps(actions) {
    const steps = [];
    let stepId = 1;
    let context = null;

    for (const action of actions) {
        const currentContext = `${action.windowLabel}::${action.frameChain}`;
        if (context !== currentContext) {
            steps.push({
                id: stepId++,
                kind: 'context.switch',
                windowLabel: action.windowLabel,
                frameChain: action.frameChain,
                timestamp: action.timestamp
            });
            context = currentContext;
        }

        const step = {
            id: stepId++,
            kind: `ui.${action.actionType}`,
            timestamp: action.timestamp
        };

        if (action.selector) {
            step.target = {
                selector: action.selector,
                score: action.selectorScore,
                source: action.selectorSource
            };
        }
        if (action.value !== undefined) step.value = action.value;
        if (action.key !== undefined) step.key = action.key;
        if (action.url) step.url = action.url;
        if (action.method) step.method = action.method;
        if (action.postData) step.postData = action.postData;
        if (action.message) step.message = action.message;
        if (action.dialogType) step.dialogType = action.dialogType;
        if (action.from) step.from = action.from;
        if (action.to) step.to = action.to;
        if (typeof action.scrollTop === 'number') step.scrollTop = action.scrollTop;
        if (typeof action.scrollLeft === 'number') step.scrollLeft = action.scrollLeft;

        steps.push(step);
    }

    return steps;
}

function extractLookupKeyFromUrl(url) {
    if (typeof url !== 'string' || !url) return null;
    try {
        const parsed = new URL(url);
        const key = parsed.searchParams.get('UKN');
        if (typeof key === 'string' && key.trim()) return key.trim();
    } catch {
        // ignore malformed urls and fallback to regex
    }

    const match = url.match(/[?&]UKN=([^&]+)/i);
    if (!match) return null;
    try {
        const decoded = decodeURIComponent(match[1]);
        return decoded.trim() || null;
    } catch {
        return match[1].trim() || null;
    }
}

function isMeaningfulLookupValue(value) {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (/^\*+$/.test(trimmed)) return false;
    return true;
}

function candidateScoreForLookupValue(action, lookupKey) {
    if (!action || !isMeaningfulLookupValue(action.value)) return -1;

    let score = 0;
    if (action.actionType === 'blur') score += 20;
    if (action.actionType === 'fill') score += 12;
    if (action.actionType === 'select') score += 10;

    const selector = String(action.selector || '').toLowerCase();
    const key = String(lookupKey || '').toLowerCase();
    if (key && selector.includes(key)) score += 40;

    // Lookup key'den en anlamlı terimi çıkar:
    // 1) "Kod"/"Kodu" son eki kaldır  ("TXTEKGRUPKOD" → "TXTEKGRUP")
    // 2) Bilinen teknik ön ekler kaldır ("TXTEKGRUP" → "EKGRUP")
    // Böylece "TXTEKGRUPKOD" → "ekgrup" ve edtEkGrupKodu selector ile eşleşir.
    const knownPrefixes = ['txtlng', 'lngtxt', 'igtxt', 'txt', 'lng', 'igt', 'edt'];
    let keyTerm = key.replace(/kodu?$/i, '').trim();
    for (const pfx of knownPrefixes) {
        if (keyTerm.startsWith(pfx) && keyTerm.length > pfx.length + 2) {
            keyTerm = keyTerm.slice(pfx.length);
            break;
        }
    }
    if (keyTerm.length > 2 && selector.includes(keyTerm)) score += 30;

    // "kod" genel bonusu: yalnızca keyTerm "kod" içermiyorsa sayılsın
    if (selector.includes('kod') && !keyTerm.includes('kod')) score += 8;

    if (selector.includes('urun') || selector.includes('must') || selector.includes('dist')) score += 8;

    return score;
}

function isLikelyLookupButtonSelector(selector) {
    if (typeof selector !== 'string') return false;
    const s = selector.toLowerCase();
    if (s.includes('rehber')) return true;
    if (/_[a-z]{2}_b\d+/.test(s)) return true;
    if (s.includes('> img') && /_[a-z]{2}_/.test(s)) return true;
    if (s.includes('lookup') && s.includes('img')) return true;
    return false;
}

function candidateScoreForLookupButton(action, requestAction, lookupKey) {
    if (!action || !['click', 'dblclick'].includes(action.actionType)) return -1;
    if (action.windowLabel !== requestAction.windowLabel || action.frameChain !== requestAction.frameChain) return -1;

    const selector = String(action.selector || '');
    if (!selector) return -1;

    const key = String(lookupKey || '').toLowerCase();
    const selectorLower = selector.toLowerCase();
    const isLikely = isLikelyLookupButtonSelector(selector);
    const keyMatch = key && selectorLower.includes(key.toLowerCase());

    // Rehber butonu olmayan genel toolbar clicklerini ele.
    if (!isLikely && !keyMatch) return -1;

    let score = action.actionType === 'click' ? 25 : 18;
    if (isLikely) score += 60;
    if (keyMatch) score += 25;

    const tsA = Number.isFinite(action.timestamp) ? action.timestamp : null;
    const tsR = Number.isFinite(requestAction.timestamp) ? requestAction.timestamp : null;
    if (tsA !== null && tsR !== null) {
        const delta = Math.abs(tsA - tsR);
        if (delta <= 3000) score += Math.max(0, 35 - Math.floor(delta / 100));
        if (tsA >= tsR) score += 4;
    }

    return score;
}

function inferLookupButtonSelector(ownerSelector) {
    if (typeof ownerSelector !== 'string' || !ownerSelector.trim()) return null;
    const trimmed = ownerSelector.trim();
    const m = trimmed.match(/^(.*_([A-Za-z]{2}))_t$/i);
    if (m) {
        const type = m[2].toUpperCase();
        const base = m[1];
        // TE tipi içinde buton <img> içeren <td>'dir; diğer tipler doğrudan <td>
        return type === 'TE' ? `${base}_b0 > img` : `${base}_b0`;
    }
    return null;
}

function extractLookupButtonSelector(actions, requestIndex, requestAction, lookupKey, ownerSelector) {
    let bestAction = null;
    let bestScore = -1;
    const start = Math.max(0, requestIndex - 10);
    const end = Math.min(actions.length - 1, requestIndex + 10);

    for (let i = start; i <= end; i++) {
        const action = actions[i];
        const score = candidateScoreForLookupButton(action, requestAction, lookupKey);
        if (score > bestScore) {
            bestScore = score;
            bestAction = action;
        }
    }

    if (bestAction && bestAction.selector) {
        return {
            selector: bestAction.selector,
            source: 'recorded'
        };
    }

    const inferred = inferLookupButtonSelector(ownerSelector);
    if (inferred) {
        return {
            selector: inferred,
            source: 'inferred'
        };
    }

    return {
        selector: null,
        source: null
    };
}

function extractLookupHints(actions) {
    const hints = [];
    const dedupe = new Set();

    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (action.actionType !== 'network_request') continue;

        const lookupKey = extractLookupKeyFromUrl(action.url);
        if (!lookupKey) continue;

        let bestCandidate = null;
        let bestScore = -1;
        let bestKeyMatchedCandidate = null;
        let bestKeyMatchedScore = -1;
        const maxTs = Number.isFinite(action.timestamp) ? action.timestamp + 20000 : Number.MAX_SAFE_INTEGER;
        const lookupKeyLower = String(lookupKey || '').toLowerCase();

        for (let j = i + 1; j < actions.length; j++) {
            const next = actions[j];
            if (Number.isFinite(next.timestamp) && next.timestamp > maxTs) break;

            if (next.windowLabel !== action.windowLabel || next.frameChain !== action.frameChain) continue;
            if (!['blur', 'fill', 'select'].includes(next.actionType)) continue;

            const score = candidateScoreForLookupValue(next, lookupKey);
            if (score > bestScore) {
                bestScore = score;
                bestCandidate = next;
            }

            const selectorLower = String(next.selector || '').toLowerCase();
            if (lookupKeyLower && selectorLower.includes(lookupKeyLower) && score > bestKeyMatchedScore) {
                bestKeyMatchedScore = score;
                bestKeyMatchedCandidate = next;
            }
        }

        const chosenCandidate = bestKeyMatchedCandidate || bestCandidate;
        if (!chosenCandidate || !isMeaningfulLookupValue(chosenCandidate.value)) continue;

        const dedupeKey = `${lookupKey}::${action.windowLabel}::${action.frameChain}::${chosenCandidate.value}`;
        if (dedupe.has(dedupeKey)) continue;
        dedupe.add(dedupeKey);

        const lookupButton = extractLookupButtonSelector(
            actions,
            i,
            action,
            lookupKey,
            chosenCandidate.selector || null,
        );

        hints.push({
            lookupKey,
            expectedValue: chosenCandidate.value,
            ownerContext: {
                windowLabel: action.windowLabel,
                frameChain: action.frameChain
            },
            ownerSelector: chosenCandidate.selector || null,
            lookupButtonSelector: lookupButton.selector,
            lookupButtonSelectorSource: lookupButton.source,
            fromStep: {
                requestTimestamp: action.timestamp,
                valueTimestamp: chosenCandidate.timestamp
            }
        });
    }

    return hints;
}

function inferDetailGridId(selector) {
    if (typeof selector !== 'string') return null;
    const okMatch = selector.match(/#([A-Za-z0-9_]+)_RT_[A-Za-z0-9_]*BtnOK/i);
    if (okMatch) return okMatch[1];
    const inputMatch = selector.match(/#([A-Za-z0-9_]+)_RT_/i);
    if (inputMatch) return inputMatch[1];
    return null;
}

function isDetailOkSelector(selector) {
    if (typeof selector !== 'string') return false;
    return /_RT_[A-Za-z0-9_]*BtnOK/i.test(selector) || /DetGrdBtnOK/i.test(selector);
}

function isDetailEditorSelector(selector) {
    if (typeof selector !== 'string') return false;
    return /_RT_/.test(selector) && /_(?:TE|NBE|BE)_t\b/i.test(selector);
}

function extractDetailCommitHints(actions) {
    const hints = [];
    const seen = new Set();

    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (!['click', 'dblclick'].includes(action.actionType) || !isDetailOkSelector(action.selector)) continue;

        const gridId = inferDetailGridId(action.selector);
        if (!gridId) continue;

        let editorInputSelector = null;
        for (let j = i - 1; j >= 0 && j >= i - 25; j--) {
            const prev = actions[j];
            if (prev.windowLabel !== action.windowLabel || prev.frameChain !== action.frameChain) continue;
            if (isDetailEditorSelector(prev.selector)) {
                editorInputSelector = prev.selector;
                break;
            }
        }

        const rowProofSelector = `#${gridId}_R0 > th`;
        const editorContainerSelector = `#${gridId}_RT_TBL`;
        const dedupeKey = `${action.windowLabel}::${action.frameChain}::${action.selector}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        hints.push({
            ownerContext: {
                windowLabel: action.windowLabel,
                frameChain: action.frameChain
            },
            okButtonSelector: action.selector,
            rowProofSelector,
            editorInputSelector,
            editorContainerSelector,
            recommendedProofs: [
                { selector: rowProofSelector, state: 'visible', role: 'rowProof' },
                { selector: action.selector, state: 'hidden', role: 'okButtonClosed' },
                ...(editorInputSelector ? [{ selector: editorInputSelector, state: 'hidden', role: 'editorInputClosed' }] : []),
                { selector: editorContainerSelector, state: 'hidden', role: 'editorClosed' }
            ],
            fromStep: {
                clickTimestamp: action.timestamp
            }
        });
    }

    return hints;
}

function isLikelyDetailAddSelector(selector) {
    if (typeof selector !== 'string') return false;
    const s = selector.toLowerCase();
    if (isLikelyLookupButtonSelector(selector)) return false;
    if (isDetailOkSelector(selector)) return false;
    return (
        s.includes('gridnvgxtoolbar_item_1') ||
        s.includes('toolbar_item_1') ||
        s.includes('add') ||
        s.includes('new') ||
        s.includes('yeni')
    );
}

function extractDetailEditorHints(actions) {
    const hints = [];
    const seen = new Set();
    const seenAddClicks = new Set();

    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (!isDetailEditorSelector(action.selector)) continue;

        let addAction = null;
        for (let j = i - 1; j >= 0 && j >= i - 12; j--) {
            const prev = actions[j];
            if (prev.windowLabel !== action.windowLabel || prev.frameChain !== action.frameChain) continue;
            if (!['click', 'dblclick'].includes(prev.actionType)) continue;
            if (isLikelyDetailAddSelector(prev.selector)) {
                addAction = prev;
                break;
            }
        }

        if (!addAction) continue;

        const addClickKey = `${addAction.windowLabel}::${addAction.frameChain}::${addAction.selector}::${addAction.timestamp}`;
        if (seenAddClicks.has(addClickKey)) continue;
        seenAddClicks.add(addClickKey);

        const gridId = inferDetailGridId(action.selector);
        const dedupeKey = `${action.windowLabel}::${action.frameChain}::${addAction.selector}::${action.selector}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        let quantitySelector = null;
        let okButtonSelector = null;
        for (let j = i + 1; j < actions.length && j <= i + 60; j++) {
            const next = actions[j];
            if (next.windowLabel !== action.windowLabel || next.frameChain !== action.frameChain) continue;
            const selector = String(next.selector || '');
            if (!quantitySelector && isDetailEditorSelector(selector) && /miktar|mik|quantity|qty/i.test(selector)) {
                quantitySelector = selector;
            }
            if (!okButtonSelector && isDetailOkSelector(selector)) {
                okButtonSelector = selector;
                break;
            }
        }

        hints.push({
            ownerContext: {
                windowLabel: action.windowLabel,
                frameChain: action.frameChain
            },
            addDetailButtonSelector: addAction.selector,
            firstEditorSelector: action.selector,
            quantitySelector,
            okButtonSelector,
            editorContainerSelector: gridId ? `#${gridId}_RT_TBL` : null,
            rule: 'After clicking addDetailButtonSelector, wait for firstEditorSelector before interacting with later fields.',
            fromStep: {
                addClickTimestamp: addAction.timestamp,
                firstEditorTimestamp: action.timestamp
            }
        });
    }

    return hints;
}

// ── Popup Lineage ─────────────────────────────────────────────────────────────
function buildPopupLineage(actions) {
    const lineage = [];
    const seenWindows = new Set(['main']);
    const actionsSorted = [...actions].sort(stableActionSort);

    for (let i = 0; i < actionsSorted.length; i++) {
        const action = actionsSorted[i];
        if (seenWindows.has(action.windowLabel)) continue;
        seenWindows.add(action.windowLabel);

        if (!action.windowLabel.startsWith('popup')) continue;

        const opener = [...actionsSorted]
            .slice(0, i)
            .reverse()
            .find(a => a.actionType === 'click' && a.windowLabel !== action.windowLabel);

        lineage.push({
            popupLabel: action.windowLabel,
            openedBy: opener ? {
                windowLabel: opener.windowLabel,
                frameChain: opener.frameChain,
                selector: opener.selector,
                timestamp: opener.timestamp
            } : null,
            firstSeenUrl: action.url
        });
    }

    return lineage;
}

// ── Frame Markers ─────────────────────────────────────────────────────────────
function buildFrameMarkers(actions) {
    const markers = {};

    for (const action of actions) {
        if (!action.frameChain || action.frameChain === 'main') continue;
        if (!action.selector || !['click', 'fill', 'blur'].includes(action.actionType)) continue;
        if (markers[action.frameChain]) continue;

        markers[action.frameChain] = {
            frameChain: action.frameChain,
            windowLabel: action.windowLabel,
            confirmedSelector: action.selector,
            url: action.url
        };
    }

    return markers;
}

// ── Save / Close Hints ────────────────────────────────────────────────────────
function isMainToolbarSelector(selector) {
    if (typeof selector !== 'string') return false;
    return /^#MainNvgxToolbar_Item_\d+/.test(selector);
}

function isMainNavigationSaveRequest(action) {
    if (!action || action.actionType !== 'network_request') return false;
    if (String(action.method || '').toUpperCase() !== 'POST') return false;
    const url = String(action.url || '');
    if (!/\/Interface\/Erc\//i.test(url)) return false;
    try {
        const parsed = new URL(url);
        return parsed.searchParams.get('reqSender') === 'MainNvg';
    } catch {
        return /[?&]reqSender=MainNvg(?:&|$)/i.test(url);
    }
}

/**
 * DML form ana toolbar'ındaki Kaydet ve Kapat butonlarını recording sırasından çıkarır.
 *
 * Kural:
 *  - Aynı window+frame içindeki tüm MainNvgxToolbar tıklamaları toplanır.
 *  - Son tıklama → closeButtonSelector (formu kapatır).
 *  - Sondan bir önceki FARKLI selector → saveButtonSelector (kaydeder, form açık kalır).
 *  - Sadece tek tıklama varsa ya da tüm tıklamalar aynı selector ise combined=true;
 *    tek buton hem kaydeder hem kapatır (saveAndCloseWithRetry yerine tek click + waitForClose).
 */
function extractSaveCloseHints(actions) {
    const groups = new Map();

    for (const action of actions) {
        if (!['click', 'dblclick'].includes(action.actionType)) continue;
        if (!isMainToolbarSelector(action.selector)) continue;

        const key = `${action.windowLabel}::${action.frameChain}`;
        if (!groups.has(key)) {
            groups.set(key, { windowLabel: action.windowLabel, frameChain: action.frameChain, clicks: [] });
        }
        groups.get(key).clicks.push(action);
    }

    const hints = [];
    const hintedContexts = new Set();
    for (const group of groups.values()) {
        const clicks = group.clicks;
        if (clicks.length === 0) continue;

        const lastClick = clicks[clicks.length - 1];
        const closeSelector = lastClick.selector;

        let saveSelector = null;
        for (let i = clicks.length - 2; i >= 0; i--) {
            if (clicks[i].selector !== closeSelector) {
                saveSelector = clicks[i].selector;
                break;
            }
        }

        const combined = saveSelector === null;
        hints.push({
            ownerContext: {
                windowLabel: group.windowLabel,
                frameChain: group.frameChain
            },
            saveButtonSelector: combined ? closeSelector : saveSelector,
            closeButtonSelector: combined ? null : closeSelector,
            combined,
            fromSteps: {
                saveClickTimestamp: combined
                    ? lastClick.timestamp
                    : (clicks.find(c => c.selector === saveSelector) || {}).timestamp,
                closeClickTimestamp: combined ? null : lastClick.timestamp
            }
        });
        hintedContexts.add(`${group.windowLabel}::${group.frameChain}`);
    }

    for (const action of actions) {
        if (!isMainNavigationSaveRequest(action)) continue;
        const contextKey = `${action.windowLabel}::${action.frameChain}`;
        if (hintedContexts.has(contextKey)) continue;
        hints.push({
            ownerContext: {
                windowLabel: action.windowLabel,
                frameChain: action.frameChain
            },
            saveButtonSelector: '#MainNvgxToolbar_Item_1 > span',
            closeButtonSelector: null,
            combined: true,
            source: 'network-fallback',
            fromSteps: {
                saveClickTimestamp: action.timestamp,
                closeClickTimestamp: null
            }
        });
        hintedContexts.add(contextKey);
    }

    return hints;
}

// ── Noise Step Filter ─────────────────────────────────────────────────────────
const NOISE_SELECTORS = new Set([
    '#ListGrid_R0 > th',
    '#body',
    '#DCC_DetGrd_R0 > th',
]);

function isNoiseStep(step) {
    if (!step) return false;
    if (['ui.network_request', 'context.switch'].includes(step.kind)) return false;
    if (step.target && NOISE_SELECTORS.has(step.target.selector)) return true;
    if (step.kind === 'ui.hover') return true;
    if (step.kind === 'ui.focus') return true;
    return false;
}

function normalizeRecording(recording) {
    if (!recording || typeof recording !== 'object') {
        throw new Error('normalizeRecording: recording object bekleniyor.');
    }

    const actions = Array.isArray(recording.actions) ? recording.actions : [];
    const sanitized = actions
        .map((action, idx) => sanitizeAction(action, idx))
        .filter(Boolean)
        .sort(stableActionSort);

    const denoised = dropNoise(sanitized);
    const rawSteps = toDslSteps(denoised);
    const steps = rawSteps.filter(s => !isNoiseStep(s));
    const lookupHints = extractLookupHints(denoised);
    const detailEditorHints = extractDetailEditorHints(denoised);
    const detailCommitHints = extractDetailCommitHints(denoised);
    const saveCloseHints = extractSaveCloseHints(denoised);
    const popupLineage = buildPopupLineage(denoised);
    const frameMarkers = buildFrameMarkers(denoised);

    return {
        schemaVersion: '1.0',
        dslVersion: '1.0',
        source: {
            targetUrl: recording.targetUrl || null,
            recordedAt: recording.recordedAt || null,
            totalActions: actions.length
        },
        stats: {
            sanitizedActions: sanitized.length,
            normalizedActions: denoised.length,
            droppedNoiseActions: sanitized.length - denoised.length,
            totalSteps: steps.length,
            droppedNoiseSteps: rawSteps.length - steps.length
        },
        selectorPolicy: 'id > data-* > css > xpath',
        lookupHints,
        detailEditorHints,
        detailCommitHints,
        saveCloseHints,
        popupLineage,
        frameMarkers,
        steps
    };
}

function normalizeRecordingFromFile(inputPath) {
    const absPath = path.resolve(inputPath);
    const raw = fs.readFileSync(absPath, 'utf8');
    const recording = JSON.parse(raw);
    return normalizeRecording(recording);
}

function writeNormalizedOutput(outputPath, normalized) {
    const absPath = path.resolve(outputPath);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, JSON.stringify(normalized, null, 2), 'utf8');
}

module.exports = {
    normalizeRecording,
    normalizeRecordingFromFile,
    writeNormalizedOutput,
    selectorScore,
    extractDetailCommitHints,
    extractDetailEditorHints,
    buildPopupLineage,
    buildFrameMarkers,
    isNoiseStep
};
