import { Frame, Page } from '@playwright/test';
import { LookupHelper } from './LookupHelper';

type CommitProofState = 'visible' | 'hidden' | 'attached' | 'detached';

export interface DetailCommitProof {
    selector: string;
    state: CommitProofState;
}

export interface DetailCommitOptions {
    okButtonSelector: string;
    rowProofSelector: string;
    retries?: number;
    timeout?: number;
    proofSelectors?: DetailCommitProof[];
}

/**
 * BasePage: Tüm sayfa nesnelerinin (Page Objects) temel sınıfı.
 * Panorama ERP'nin karmaşık hiyerarşisini ve sekme yapısını yönetmek için
 * en dayanıklı (robust) metodları barındırır.
 */
export class BasePage {
    protected page: Page;
    protected readonly defaultLookupTimeout = Number(process.env.ERP_LOOKUP_TIMEOUT_MS ?? 8000);

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Kapanmis referanslara takilmamak icin context icindeki en uygun acik sayfayi secer.
     */
    getActivePage(preferredUrlPatterns: RegExp[] = []): Page {
        const openPages = this.page
            .context()
            .pages()
            .filter((p) => !p.isClosed());

        const preferred = preferredUrlPatterns.length > 0
            ? openPages.find((p) => preferredUrlPatterns.some((rx) => rx.test(p.url())))
            : null;

        if (preferred) {
            this.page = preferred;
            return this.page;
        }

        const samePageAlive = openPages.find((p) => p === this.page);
        if (samePageAlive) {
            this.page = samePageAlive;
            return this.page;
        }

        const fallback = openPages[openPages.length - 1];
        if (!fallback) {
            throw new Error('Aktif page bulunamadi: tum browser page referanslari kapanmis olabilir.');
        }

        this.page = fallback;
        return this.page;
    }

    /**
     * Stale/closed page riskini azaltmak icin context-bagimsiz kisa bekleme.
     */
    async sleep(ms: number): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Frame index'e bagli kalmadan, semantic marker'lar gorunur olan frame'i bulur.
     */
    async resolveFrameByAnyVisibleMarker(
        markerSelectors: string[],
        timeout = 15000,
        preferredUrlPatterns: RegExp[] = [],
    ): Promise<Frame> {
        const end = Date.now() + timeout;

        while (Date.now() < end) {
            const activePage = this.getActivePage(preferredUrlPatterns);

            for (const frame of activePage.frames()) {
                for (const markerSelector of markerSelectors) {
                    const isVisible = await frame
                        .locator(markerSelector)
                        .first()
                        .isVisible()
                        .catch(() => false);
                    if (isVisible) return frame;
                }
            }

            if (!activePage.isClosed()) {
                await activePage.waitForLoadState('domcontentloaded', { timeout: 2000 }).catch(() => { });
            }
            await this.sleep(200);
        }

        throw new Error(`Frame bulunamadi. Marker listesi: ${markerSelectors.join(' | ')}`);
    }

    private visible(selector: string) {
        return this.page.locator(`${selector}:visible`).first();
    }

    /**
     * Sayfanın DOM içeriğinin yüklenmesini bekler.
     */
    async waitForPageLoad(timeout = 30000): Promise<void> {
        await this.page.waitForLoadState('domcontentloaded', { timeout });
    }

    /**
     * Dayanıklı Tıklama (Robust Click):
     * Elementin görünmesini bekler, üzerine odaklanır (hover) ve zorlayarak (force) tıklar.
     */
    async clickRobust(selector: string, timeout = 15000): Promise<void> {
        const locator = this.page.locator(selector).first();
        await locator.waitFor({ state: 'visible', timeout });
        await locator.hover().catch(() => { });
        await this.page.waitForTimeout(200);
        await locator.click({ force: true });
    }

    /**
     * Tıkla ve network boşalana kadar bekle.
     * Kaydet, submit, server çağrısı tetikleyen her buton için kullan.
     * waitForTimeout(X) yazma — sunucu ne zaman cevap verirse o zaman devam eder.
     */
    async clickAndWaitForIdle(selector: string, timeout = 15000): Promise<void> {
        const locator = this.page.locator(selector);
        await locator.waitFor({ state: 'visible', timeout });
        await locator.click({ force: true });
        await this.page.waitForLoadState('networkidle', { timeout }).catch(() => { });
    }

    /**
     * Tıkla ve hedef element istenen duruma gelene kadar bekle.
     * Menü açma, dialog kapama, UI geçişleri için kullan.
     * Örnek: clickAndWaitFor(menuBtn, subMenuItem, 'visible')
     */
    async clickAndWaitFor(
        clickSelector: string,
        waitSelector: string,
        state: 'visible' | 'hidden' = 'visible',
        timeout = 10000,
    ): Promise<void> {
        const clickTarget = this.page.locator(clickSelector);
        await clickTarget.waitFor({ state: 'visible', timeout });
        await clickTarget.click({ force: true });
        await this.page.locator(waitSelector).waitFor({ state, timeout });
    }

    /**
     * Frame icindeki elemente tiklayip yine frame icindeki hedef state'i bekler.
     * List/grid toolbar aksiyonlarinda page-level locator yerine bu helper tercih edilmelidir.
     */
    async clickAndWaitForInFrame(
        frame: Frame,
        clickSelector: string,
        waitSelector: string,
        state: 'visible' | 'hidden' = 'visible',
        timeout = 10000,
        fallbackClickSelector?: string,
    ): Promise<void> {
        const clickTarget = frame.locator(clickSelector).first();
        const clicked = await clickTarget
            .waitFor({ state: 'visible', timeout })
            .then(async () => {
                await clickTarget.click({ force: true });
                return true;
            })
            .catch(async () => {
                if (!fallbackClickSelector) return false;
                const fallbackTarget = frame.locator(fallbackClickSelector).first();
                return fallbackTarget
                    .waitFor({ state: 'visible', timeout: Math.max(1000, Math.floor(timeout / 2)) })
                    .then(async () => {
                        await fallbackTarget.click({ force: true });
                        return true;
                    })
                    .catch(() => false);
            });

        if (!clicked) {
            throw new Error(`Frame click target gorunur degil: ${clickSelector}`);
        }

        await frame.locator(waitSelector).first().waitFor({ state, timeout });
    }

    /**
     * Tıkla ve hedef state'i kısa süre kanıt olarak ara; bulunamazsa akışı öldürmez.
     * Lookup fallback gibi sonraki adımların kendi kurtarma stratejisi olduğu grid editor geçişlerinde kullan.
     */
    async clickAndOptionallyWaitFor(
        clickSelector: string,
        waitSelector: string,
        state: 'visible' | 'hidden' = 'visible',
        timeout = 3000,
    ): Promise<boolean> {
        const clickTarget = this.page.locator(clickSelector).first();
        await clickTarget.waitFor({ state: 'visible', timeout });
        await clickTarget.click({ force: true });
        return this.page.locator(waitSelector).first().waitFor({ state, timeout })
            .then(() => true)
            .catch(() => false);
    }

    /**
     * Frame içindeki editor açılışlarında non-fatal bekleme.
     * Hedef görünmezse false döner; çağıran lookup/manual-fill fallback'e devam edebilir.
     */
    async clickAndOptionallyWaitForInFrame(
        frame: Frame,
        clickSelector: string,
        waitSelector: string,
        state: 'visible' | 'hidden' = 'visible',
        timeout = 3000,
        fallbackClickSelector?: string,
    ): Promise<boolean> {
        const clickTarget = frame.locator(clickSelector).first();
        const clicked = await clickTarget
            .waitFor({ state: 'visible', timeout })
            .then(async () => {
                await clickTarget.click({ force: true });
                return true;
            })
            .catch(async () => {
                if (!fallbackClickSelector) return false;
                const fallbackTarget = frame.locator(fallbackClickSelector).first();
                return fallbackTarget
                    .waitFor({ state: 'visible', timeout: Math.max(1000, Math.floor(timeout / 2)) })
                    .then(async () => {
                        await fallbackTarget.click({ force: true });
                        return true;
                    })
                    .catch(() => false);
            });

        if (!clicked) {
            throw new Error(`Frame click target gorunur degil: ${clickSelector}`);
        }

        return frame.locator(waitSelector).first().waitFor({ state, timeout })
            .then(() => true)
            .catch(() => false);
    }

    /**
     * Detay editor'u acma aksiyonunu tekrar deneyerek ilk editor alaninin gorunur olmasini zorlar.
     * Editor acilmadan detail lookup/fill adimina devam edilmesini engeller.
     */
    async ensureEditorVisibleAfterTriggerInFrame(
        frame: Frame,
        triggerSelector: string,
        editorSelector: string,
        options?: {
            attempts?: number;
            timeoutPerAttempt?: number;
            fallbackClickSelector?: string;
            settleMs?: number;
        },
    ): Promise<void> {
        const attempts = Math.max(1, options?.attempts ?? 3);
        const timeoutPerAttempt = Math.max(1000, options?.timeoutPerAttempt ?? 3000);
        const settleMs = Math.max(100, options?.settleMs ?? 250);
        const editor = frame.locator(editorSelector).first();

        if (await editor.isVisible().catch(() => false)) return;

        for (let attempt = 1; attempt <= attempts; attempt++) {
            const opened = await this.clickAndOptionallyWaitForInFrame(
                frame,
                triggerSelector,
                editorSelector,
                'visible',
                timeoutPerAttempt,
                options?.fallbackClickSelector,
            );
            if (opened) return;

            await this.sleep(settleMs);
            const becameVisible = await editor.isVisible().catch(() => false);
            if (becameVisible) return;
        }

        throw new Error(
            `Detay editor gorunur olmadi. trigger=${triggerSelector} editor=${editorSelector} attempts=${attempts}`,
        );
    }

    /**
     * Sol menulerde hidden/gorunur duplicate node riskine karsi
     * sadece gorunur menu dugumunu tiklar; gerekirse JS fallback uygular.
     */
    async clickVisibleWithFallback(selector: string, timeout = 10000): Promise<void> {
        const menu = this.visible(selector);
        await menu.waitFor({ state: 'visible', timeout });

        await menu.click({ force: true }).catch(async () => {
            await this.page.evaluate((sel) => {
                const candidates = Array.from(document.querySelectorAll(sel)) as HTMLElement[];
                const visible = candidates.find((el) => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
                });
                if (!visible) return;
                const clickable = (visible.closest('a') as HTMLElement | null) ?? visible;
                clickable.click();
            }, selector);
        });
    }

    /**
     * Toggle menu agacinda child zaten gorunurse parent'a tekrar tiklamaz.
     * Child gorunmezse kisa timeout + sinirli retry ile acmayi dener.
     */
    async ensureSubMenuVisible(parentSelector: string, childSelector: string, timeout = 10000): Promise<void> {
        const child = this.visible(childSelector);
        const alreadyVisible = await child.isVisible().catch(() => false);
        if (alreadyVisible) return;

        const perAttemptTimeout = Math.max(1500, Math.floor(timeout / 3));
        for (let attempt = 0; attempt < 3; attempt++) {
            await this.clickVisibleWithFallback(parentSelector, timeout);

            const expanded = await child.waitFor({ state: 'visible', timeout: perAttemptTimeout })
                .then(() => true)
                .catch(() => false);
            if (expanded) return;

            await this.page.evaluate((sel) => {
                const candidates = Array.from(document.querySelectorAll(sel)) as HTMLElement[];
                const visible = candidates.find((el) => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
                });
                if (!visible) return;
                const clickable = (visible.closest('a') as HTMLElement | null) ?? visible;
                clickable.click();
            }, parentSelector);

            const expandedAfterJs = await child.waitFor({ state: 'visible', timeout: perAttemptTimeout })
                .then(() => true)
                .catch(() => false);
            if (expandedAfterJs) return;
        }

        throw new Error(`Alt menu gorunur olmadi: parent=${parentSelector} child=${childSelector}`);
    }

    /**
     * Dayanıklı Doldurma (Robust Fill):
     * Alana tıklar, mevcut içeriği temizler ve yeni değeri yazar.
     */
    async fillRobust(selector: string, value: string): Promise<void> {
        const locator = this.page.locator(selector);
        await locator.waitFor({ state: 'visible', timeout: 15000 });
        await locator.click().catch(() => { }); // Odaklanmak için tıkla
        await locator.clear();
        await locator.fill(value);
    }

    async fillRobustInFrame(frame: Frame, selector: string, value: string): Promise<void> {
        const locator = frame.locator(selector).first();
        await locator.waitFor({ state: 'visible', timeout: 15000 });
        await locator.click().catch(() => { });
        await locator.clear();
        await locator.fill(value);
    }

    /**
     * İnsan benzeri yazım: alana tıklar, temizler ve karakterleri gecikmeli yazar.
     * Login/OTP gibi bazı ERP ekranlarında otomasyon engelini azaltmak için kullanılır.
     */
    async typeLikeHuman(
        selector: string,
        value: string,
        delayMs = 80,
        timeout = 15000,
    ): Promise<void> {
        const locator = this.page.locator(selector);
        await locator.waitFor({ state: 'visible', timeout });
        await locator.click({ force: true });
        await locator.clear();
        await locator.pressSequentially(value, { delay: delayMs });
    }

    /**
     * Lookup (rehber) butonuna tıklayıp popup‑pencereden ilk satırı seçer.
     * Ortak bir helper kullanarak kod tekrarını önler.
     * @param buttonSelector - Rehber butonunu tetikleyen seçici
     * @param gridCellSelector - Popup içindeki grid hücresi
     * @param tabSelector - (Opsiyonel) Butona basmadan önce tıklanacak sekme seçicisi
     * @param tabText - (Opsiyonel) Sekme seçicisini filtrelemek için kullanılacak metin
     */
    async useLookup(
        buttonSelector: string,
        gridCellSelector = '#ListGrid_R0C0',
        tabSelector?: string,
        tabText?: string,
        timeout = this.defaultLookupTimeout,
    ): Promise<void> {
        await LookupHelper.selectFirstFromLookup(this.page, buttonSelector, gridCellSelector, timeout, tabSelector, tabText);
    }

    /**
     * Rehber butonundan popup açıp değer bazlı seçim yapar.
     * Popup açılamazsa kayıttan gelen değeri input'a yazıp Tab ile devam eder.
     */
    async useLookupByValueWithFallback(
        buttonSelector: string,
        inputSelector: string,
        expectedValue: string,
        timeout = this.defaultLookupTimeout,
        lookupKey?: string,
        gridFirstColumnSelector = '#ListGrid td[id$="C0"]',
        gridFallbackSelector = '#ListGrid_R0C0',
        selectButtonSelector = '#NvgxToolbar_Item_0 > span',
        tabSelector?: string,
        tabText?: string,
    ): Promise<void> {
        await LookupHelper.selectByValueFromLookupOrFill(
            this.page,
            buttonSelector,
            inputSelector,
            expectedValue,
            timeout,
            gridFirstColumnSelector,
            gridFallbackSelector,
            selectButtonSelector,
            tabSelector,
            tabText,
            lookupKey,
        );
    }

    /**
     * Detay satiri OK ile kaydetme adimini guvenli sekilde tamamlar.
     * Bazı ERP ekranlarında ilk tiklama commit etmeyebilir.
     * Bu nedenle OK sonrasi "stabil element" gorunurlugu ile commit dogrulanir.
     */
    async commitDetailRow(
        okButtonSelector: string,
        stableAfterCommitSelector: string,
        retries = 2,
        timeout = 10000,
        alternativeCommitProofSelector?: string,
    ): Promise<void> {
        const okButton = this.page.locator(okButtonSelector).first();
        const stableAfterCommit = this.page.locator(stableAfterCommitSelector).first();
        const alternativeProof = alternativeCommitProofSelector
            ? this.page.locator(alternativeCommitProofSelector).first()
            : null;

        await okButton.waitFor({ state: 'visible', timeout });

        for (let attempt = 0; attempt < retries; attempt++) {
            await okButton.click({ force: true });

            // Commit kaniti tek sinyale bagli olmamali:
            // 1) OK kayboldu 2) alternatif kanit gorundu
            const committed = await Promise.race([
                okButton.waitFor({ state: 'hidden', timeout: 2500 }).then(() => true).catch(() => false),
                stableAfterCommit.waitFor({ state: 'visible', timeout: 2500 }).then(() => true).catch(() => false),
                alternativeProof
                    ? alternativeProof.waitFor({ state: 'visible', timeout: 2500 }).then(() => true).catch(() => false)
                    : Promise.resolve(false),
            ]);
            if (committed) return;
        }

        throw new Error(`Detay satiri commit edilemedi: ${okButtonSelector}`);
    }

    /**
     * Detay satiri commit adimini semantik kanitlarla tamamlar.
     * Generator icin tercih edilen API budur: visible/hidden kanitlari acikca ayirir.
     */
    async commitDetailRowByProofs(options: DetailCommitOptions): Promise<void> {
        const retries = options.retries ?? 2;
        const timeout = options.timeout ?? 10000;
        const okButton = this.page.locator(options.okButtonSelector).first();
        const rowProof = this.page.locator(options.rowProofSelector).first();
        const proofs = options.proofSelectors || [];

        await okButton.waitFor({ state: 'visible', timeout });

        for (let attempt = 0; attempt < retries; attempt++) {
            await okButton.click({ force: true });

            const committed = await Promise.race([
                okButton.waitFor({ state: 'hidden', timeout: 2500 }).then(() => true).catch(() => false),
                rowProof.waitFor({ state: 'visible', timeout: 2500 }).then(() => true).catch(() => false),
                ...proofs.map((proof) =>
                    this.page
                        .locator(proof.selector)
                        .first()
                        .waitFor({ state: proof.state, timeout: 2500 })
                        .then(() => true)
                        .catch(() => false),
                ),
            ]);
            if (committed) return;
        }

        throw new Error(`Detay satiri commit edilemedi: ${options.okButtonSelector}`);
    }

    async commitDetailRowByProofsInFrame(frame: Frame, options: DetailCommitOptions): Promise<void> {
        const retries = options.retries ?? 2;
        const timeout = options.timeout ?? 10000;
        const okButton = frame.locator(options.okButtonSelector).first();
        const rowProof = frame.locator(options.rowProofSelector).first();
        const proofs = options.proofSelectors || [];
        const closingProofs = proofs.filter((proof) => proof.state === 'hidden' || proof.state === 'detached');
        const visibleProofs = proofs.filter((proof) => proof.state === 'visible' || proof.state === 'attached');

        await okButton.waitFor({ state: 'visible', timeout });

        for (let attempt = 0; attempt < retries; attempt++) {
            await okButton.click({ force: true });

            const editorClosed = await Promise.race([
                okButton.waitFor({ state: 'hidden', timeout: 2500 }).then(() => true).catch(() => false),
                ...closingProofs.map((proof) =>
                    frame
                        .locator(proof.selector)
                        .first()
                        .waitFor({ state: proof.state, timeout: 2500 })
                        .then(() => true)
                        .catch(() => false),
                ),
            ]);
            if (!editorClosed) continue;

            const rowVisible = await rowProof.waitFor({ state: 'visible', timeout: 2500 })
                .then(() => true)
                .catch(() => false);
            const extraVisibleProof = visibleProofs.length === 0 || await Promise.race(
                visibleProofs.map((proof) =>
                    frame
                        .locator(proof.selector)
                        .first()
                        .waitFor({ state: proof.state, timeout: 2500 })
                        .then(() => true)
                        .catch(() => false),
                ),
            );
            if (rowVisible && extraVisibleProof) return;
        }

        throw new Error(`Detay satiri commit edilemedi: ${options.okButtonSelector}`);
    }

    /**
     * Kaydetten sonra uzun blok networkidle beklemesine takilmadan
     * Kapat gorundugu an ilerler; kapatma icin kisa timeout + retry uygular.
     */
    async saveAndCloseWithRetry(
        saveSelector: string,
        closeSelector: string,
        closeRetryCount = 4,
        saveTimeout = 10000,
        saveSettleMs = 3000,
    ): Promise<void> {
        const saveBtn = this.page.locator(saveSelector).first();
        const closeBtn = this.page.locator(closeSelector).first();

        await saveBtn.waitFor({ state: 'visible', timeout: saveTimeout });
        await saveBtn.scrollIntoViewIfNeeded().catch(() => { });
        await saveBtn.hover({ timeout: 2000 }).catch(() => { });
        await saveBtn.click({ force: true });

        // Kaydet butonu formu kapatmaz; ERP tarafinda kaydetme islemi kisa bir
        // client/server dongusune yayilabiliyor. Kapat zaten gorunur oldugu icin
        // "close visible" kanit degildir; kaydetten sonra bilincli settle beklenir.
        await Promise.all([
            this.page.waitForLoadState('networkidle', { timeout: saveSettleMs }).catch(() => { }),
            this.sleep(saveSettleMs),
        ]);

        await closeBtn.waitFor({ state: 'visible', timeout: 10000 });

        for (let attempt = 0; attempt < closeRetryCount; attempt++) {
            await closeBtn.click({ force: true });

            const closed = await this.page.waitForEvent('close', { timeout: 2000 })
                .then(() => true)
                .catch(() => false);
            if (closed || this.page.isClosed()) return;

            await this.page.keyboard.press('Escape').catch(() => { });
            const closedAfterEsc = await this.page.waitForEvent('close', { timeout: 1000 })
                .then(() => true)
                .catch(() => false);
            if (closedAfterEsc || this.page.isClosed()) return;
        }

        throw new Error(`Form kapatilamadi: ${closeSelector}`);
    }

    async assertFormClosed(formUrlPatterns: RegExp[] = [/DML\.aspx/i, /DMLType=/i], timeout = 10000): Promise<void> {
        const end = Date.now() + timeout;

        while (Date.now() < end) {
            const openFormPages = this.page
                .context()
                .pages()
                .filter((page) =>
                    !page.isClosed() &&
                    formUrlPatterns.some((pattern) => pattern.test(page.url()))
                );
            if (openFormPages.length === 0) return;
            await this.sleep(250);
        }

        const openUrls = this.page
            .context()
            .pages()
            .filter((page) => !page.isClosed())
            .map((page) => page.url())
            .join(' | ');
        throw new Error(`Form kapanmadi. Acik sayfalar: ${openUrls}`);
    }

    /**
     * İşlem sonucu otomatik açılan popup'tan ilk satırı seçer.
     */
    async useAutoLookup(gridCellSelector = '#ListGrid_R0C0', timeout = this.defaultLookupTimeout): Promise<void> {
        await LookupHelper.selectFirstFromAutoPopup(this.page, gridCellSelector, timeout);
    }

    /**
     * Belirtilen sekmeye (yapısal seçici + metin filtresi ile) tıklar.
     */
    async switchTab(selector: string, text?: string): Promise<void> {
        let locator = this.page.locator(selector);
        if (text) {
            locator = locator.filter({ hasText: text });
        }
        const tab = locator.first();
        await tab.waitFor({ state: 'visible', timeout: 10000 });
        await tab.click();
        await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    }

    /**
     * Panorama Iframe (Tab) Erişimi:
     * Panorama'nın 'TABCtrl_WT_frameX' yapısındaki sekmelere erişim sağlar.
     * @param index Sekme indeksi (genellikle 0 veya 1)
     */
    getTabFrame(index: number) {
        return this.page.frameLocator(`#TABCtrl_WT_frame${index}`);
    }

    /**
     * Belirtilen URL'e gider ve sayfanın yüklenmesini bekler.
     */
    async navigateTo(url: string): Promise<void> {
        await this.page.goto(url);
        await this.waitForPageLoad();
    }
}





