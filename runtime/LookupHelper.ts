import { Page } from '@playwright/test';

export type LookupAuditStatus = 'start' | 'ok' | 'fail' | 'fallback';

export interface LookupAuditEntry {
  timestamp: string;
  status: LookupAuditStatus;
  action: string;
  lookupKey?: string;
  inputSelector?: string;
  buttonSelector?: string;
  expectedValue?: string;
  detail?: string;
  error?: string;
}

export class LookupHelper {
  private static auditLog: LookupAuditEntry[] = [];

  static clearAuditLog(): void {
    this.auditLog = [];
  }

  static getAuditLog(): LookupAuditEntry[] {
    return [...this.auditLog];
  }

  private static log(entry: Omit<LookupAuditEntry, 'timestamp'>): void {
    this.auditLog.push({
      timestamp: new Date().toISOString(),
      ...entry,
    });
  }

  private static errorText(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private static async blurActiveElement(page: Page): Promise<void> {
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  }

  private static async tryOpenLookupPopup(
    parentPage: Page,
    buttonSelector: string,
    inputSelector: string,
    timeout: number,
    lookupKey?: string,
    expectedValue?: string,
  ) {
    if (buttonSelector && buttonSelector.trim()) {
      try {
        this.log({
          status: 'start',
          action: 'lookup.button.wait',
          lookupKey,
          inputSelector,
          buttonSelector,
          expectedValue,
        });

        await parentPage.waitForSelector(buttonSelector, { state: 'visible', timeout });
        this.log({
          status: 'start',
          action: 'lookup.button.click',
          lookupKey,
          inputSelector,
          buttonSelector,
          expectedValue,
        });

        const [popup] = await Promise.all([
          parentPage.context().waitForEvent('page', { timeout }),
          parentPage.locator(buttonSelector).click({ force: true }),
        ]);

        this.log({
          status: 'ok',
          action: 'lookup.popup.opened.by_button',
          lookupKey,
          inputSelector,
          buttonSelector,
          expectedValue,
          detail: popup.url(),
        });
        return popup;
      } catch (error) {
        this.log({
          status: 'fail',
          action: 'lookup.popup.open.by_button_failed',
          lookupKey,
          inputSelector,
          buttonSelector,
          expectedValue,
          error: this.errorText(error),
        });
      }
    } else {
      this.log({
        status: 'fallback',
        action: 'lookup.button.missing',
        lookupKey,
        inputSelector,
        buttonSelector,
        expectedValue,
        detail: 'buttonSelector is empty; trying input click trigger',
      });
    }

    try {
      // Some ERP fields open lookup popup when the input gains focus (recorded behavior).
      const input = parentPage.locator(inputSelector);
      await input.waitFor({ state: 'visible', timeout });
      this.log({
        status: 'start',
        action: 'lookup.input.click',
        lookupKey,
        inputSelector,
        buttonSelector,
        expectedValue,
      });

      const [popup] = await Promise.all([
        parentPage.context().waitForEvent('page', { timeout }),
        input.click({ force: true }),
      ]);

      this.log({
        status: 'ok',
        action: 'lookup.popup.opened.by_input',
        lookupKey,
        inputSelector,
        buttonSelector,
        expectedValue,
        detail: popup.url(),
      });
      return popup;
    } catch (error) {
      this.log({
        status: 'fail',
        action: 'lookup.popup.open.by_input_failed',
        lookupKey,
        inputSelector,
        buttonSelector,
        expectedValue,
        error: this.errorText(error),
      });
      throw error;
    }
  }

  private static async fillFallback(
    parentPage: Page,
    inputSelector: string,
    expectedValue: string,
    timeout: number,
    lookupKey?: string,
    buttonSelector?: string,
    reason?: string,
  ): Promise<void> {
    this.log({
      status: 'fallback',
      action: 'lookup.manual_fill.start',
      lookupKey,
      inputSelector,
      buttonSelector,
      expectedValue,
      detail: reason,
    });

    const input = parentPage.locator(inputSelector);
    await input.waitFor({ state: 'visible', timeout });
    await input.fill(expectedValue);
    await input.press('Tab');

    const actual = await input.inputValue().catch(() => '');
    this.log({
      status: 'ok',
      action: 'lookup.manual_fill.done',
      lookupKey,
      inputSelector,
      buttonSelector,
      expectedValue,
      detail: `actual=${actual}`,
    });
  }

  private static async switchTabIfNeeded(
    parentPage: Page,
    timeout: number,
    tabSelector?: string,
    tabText?: string,
  ): Promise<void> {
    if (!tabSelector) return;

    let tabLocator = parentPage.locator(tabSelector);
    if (tabText) {
      tabLocator = tabLocator.filter({ hasText: tabText });
    }

    const tab = tabLocator.first();
    await tab.waitFor({ state: 'visible', timeout: Math.min(timeout, 5000) });
    await tab.click({ force: true });
    await parentPage.waitForTimeout(200);
  }

  static async selectFirstFromLookup(
    parentPage: Page,
    buttonSelector: string,
    gridCellSelector = '#ListGrid_R0C0',
    timeout = 8000,
    tabSelector?: string,
    tabText?: string,
  ): Promise<void> {
    await this.switchTabIfNeeded(parentPage, timeout, tabSelector, tabText);

    await parentPage.waitForSelector(buttonSelector, { state: 'visible', timeout });

    const [popup] = await Promise.all([
      parentPage.context().waitForEvent('page', { timeout }),
      parentPage.locator(buttonSelector).click(),
    ]);

    await popup.waitForLoadState('domcontentloaded', { timeout });
    await popup.waitForSelector(gridCellSelector, { state: 'visible', timeout });

    const cell = popup.locator(gridCellSelector).first();
    await cell.click();

    try {
      if (!popup.isClosed()) {
        await cell.press('Enter');
      }
    } catch {
      // popup may already be closed after selection
    }

    await popup.waitForEvent('close', { timeout: 2000 }).catch(async () => {
      try {
        if (!popup.isClosed()) {
          await cell.dblclick();
          await popup.waitForEvent('close', { timeout: 2000 }).catch(() => {});
        }
      } catch {
        // best effort
      }
    });

    await parentPage.bringToFront();
    await parentPage.waitForTimeout(300);
    await this.blurActiveElement(parentPage);
  }

  static async selectByValueFromLookupOrFill(
    parentPage: Page,
    buttonSelector: string,
    inputSelector: string,
    expectedValue: string,
    timeout = 8000,
    gridFirstColumnSelector = '#ListGrid td[id$="C0"]',
    gridFallbackSelector = '#ListGrid_R0C0',
    selectButtonSelector = '#NvgxToolbar_Item_0 > span',
    tabSelector?: string,
    tabText?: string,
    lookupKey?: string,
  ): Promise<void> {
    if (!expectedValue || !expectedValue.trim()) {
      throw new Error(`Lookup fallback expectedValue is empty for input: ${inputSelector}`);
    }

    this.log({
      status: 'start',
      action: 'lookup.select.start',
      lookupKey,
      inputSelector,
      buttonSelector,
      expectedValue,
    });

    await this.switchTabIfNeeded(parentPage, timeout, tabSelector, tabText);

    try {
      const popup = await this.tryOpenLookupPopup(
        parentPage,
        buttonSelector,
        inputSelector,
        timeout,
        lookupKey,
        expectedValue,
      );

      await popup.waitForLoadState('domcontentloaded', { timeout });
      await popup.waitForSelector(gridFallbackSelector, { state: 'visible', timeout });
      this.log({
        status: 'ok',
        action: 'lookup.grid.visible',
        lookupKey,
        inputSelector,
        buttonSelector,
        expectedValue,
        detail: `grid=${gridFallbackSelector}`,
      });

      const escaped = expectedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const exactRow = popup
        .locator(gridFirstColumnSelector)
        .filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`) })
        .first();
      const containsRow = popup.locator(gridFirstColumnSelector, { hasText: expectedValue }).first();

      let selectedFromPopup = false;
      if ((await exactRow.count()) > 0) {
        await exactRow.click({ force: true });
        selectedFromPopup = true;
        this.log({
          status: 'ok',
          action: 'lookup.grid.row_selected.exact',
          lookupKey,
          inputSelector,
          buttonSelector,
          expectedValue,
        });
      } else if ((await containsRow.count()) > 0) {
        await containsRow.click({ force: true });
        selectedFromPopup = true;
        this.log({
          status: 'ok',
          action: 'lookup.grid.row_selected.contains',
          lookupKey,
          inputSelector,
          buttonSelector,
          expectedValue,
        });
      }

      if (selectedFromPopup) {
        const selectButton = popup.locator(selectButtonSelector).first();
        if ((await selectButton.count()) > 0) {
          await selectButton.click({ force: true });
          this.log({
            status: 'ok',
            action: 'lookup.select_button.clicked',
            lookupKey,
            inputSelector,
            buttonSelector,
            expectedValue,
            detail: selectButtonSelector,
          });
        } else {
          await popup.keyboard.press('Enter');
          this.log({
            status: 'ok',
            action: 'lookup.enter.pressed',
            lookupKey,
            inputSelector,
            buttonSelector,
            expectedValue,
          });
        }

        await popup.waitForEvent('close', { timeout: 2500 }).catch(async () => {
          try {
            if (!popup.isClosed()) {
              await popup.locator(gridFallbackSelector).first().dblclick({ force: true });
              await popup.waitForEvent('close', { timeout: 2500 }).catch(() => {});
            }
          } catch {
            // best effort close
          }
        });
        this.log({
          status: 'ok',
          action: 'lookup.popup.selection.completed',
          lookupKey,
          inputSelector,
          buttonSelector,
          expectedValue,
        });
      } else {
        // Contract rule: when lookup cannot match expectedValue, do not pick first row.
        // Fallback to typing expectedValue into owner input and Tab.
        await popup.close().catch(() => {});
        await this.fillFallback(
          parentPage,
          inputSelector,
          expectedValue,
          timeout,
          lookupKey,
          buttonSelector,
          'expected value was not found in lookup grid',
        );
      }
    } catch (error) {
      await this.fillFallback(
        parentPage,
        inputSelector,
        expectedValue,
        timeout,
        lookupKey,
        buttonSelector,
        `popup flow failed: ${this.errorText(error)}`,
      );
    }

    await parentPage.bringToFront();
    await parentPage.waitForTimeout(300);
    await this.blurActiveElement(parentPage);
    this.log({
      status: 'ok',
      action: 'lookup.select.end',
      lookupKey,
      inputSelector,
      buttonSelector,
      expectedValue,
    });
  }

  static async selectFirstFromAutoPopup(
    parentPage: Page,
    gridCellSelector = '#ListGrid_R0C0',
    timeout = 8000,
  ): Promise<void> {
    const popup = await parentPage.context().waitForEvent('page', { timeout });
    await popup.waitForLoadState('domcontentloaded', { timeout });
    await popup.waitForSelector(gridCellSelector, { state: 'visible', timeout });
    await popup.locator(gridCellSelector).click();
    await popup.waitForEvent('close', { timeout: 2000 }).catch(() => {});
    await parentPage.bringToFront();
  }
}
