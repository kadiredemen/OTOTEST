import { expect, Frame, Page } from '@playwright/test';
import { BasePage } from '../runtime/BasePage';

/** Otomatik uretildi - 2026-05-11 */
export class MusteritanimlamaPage extends BasePage {
  private readonly lookupMap = new Map<string, { input: string; btn: string; value: string }>([
    ['DistKod', { input: '#edtDist_TE_t', btn: '#edtDist_TE_b0 > img', value: '1001' }],
    ['TXTGRUPKOD', { input: '#TABCtrl_WT__ctl0_WGB_Gruplamalar_edtGrupKodu_TE_t', btn: '#TABCtrl_WT__ctl0_WGB_Gruplamalar_edtGrupKodu_TE_b0 > img', value: '10' }],
    ['TXTEKGRUPKOD', { input: '#TABCtrl_WT__ctl0_WGB_Gruplamalar_edtEkGrupKodu_TE_t', btn: '#TABCtrl_WT__ctl0_WGB_Gruplamalar_edtEkGrupKodu_TE_b0 > img', value: '10' }],
  ]);

  private readonly S_MENU_0 = 'a > span[data-menu-kod="1077"]';
  private readonly S_MENU_1 = 'a > span[data-menu-kod="1078"]';
  private readonly S_MENU_2 = 'a > span[data-menu-kod="1079"]';
  private readonly S_LIST_HEADER = '#ListGrid_R0 > th';
  private readonly S_NEW_ACTION = '#NvgxToolbar_Item_1 > span';
  private readonly S_DISTKOD_INPUT = '#edtDist_TE_t';
  private readonly S_DISTKOD_BTN = '#edtDist_TE_b0 > img';
  private readonly S_TXTGRUPKOD_INPUT = '#TABCtrl_WT__ctl0_WGB_Gruplamalar_edtGrupKodu_TE_t';
  private readonly S_TXTGRUPKOD_BTN = '#TABCtrl_WT__ctl0_WGB_Gruplamalar_edtGrupKodu_TE_b0 > img';
  private readonly S_TXTEKGRUPKOD_INPUT = '#TABCtrl_WT__ctl0_WGB_Gruplamalar_edtEkGrupKodu_TE_t';
  private readonly S_TXTEKGRUPKOD_BTN = '#TABCtrl_WT__ctl0_WGB_Gruplamalar_edtEkGrupKodu_TE_b0 > img';
  private readonly S_SAVE = '#MainNvgxToolbar_Item_1 > span';

  constructor(page: Page) { super(page); }

  async openList(): Promise<void> {
    await this.ensureSubMenuVisible(this.S_MENU_0, this.S_MENU_1);
    await this.ensureSubMenuVisible(this.S_MENU_1, this.S_MENU_2);
    await this.clickVisibleWithFallback(this.S_MENU_2);
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  private async resolveListFrame(timeout = 15000): Promise<Frame> {
    this.page = this.getActivePage([]);
    return this.resolveFrameByAnyVisibleMarker([this.S_LIST_HEADER], timeout, []);
  }

  private async resolveFormFrame(timeout = 15000): Promise<Frame> {
    this.page = this.getActivePage([/\/Interface\/Lists\/ListCommonDML\.aspx/i]);
    return this.resolveFrameByAnyVisibleMarker(['#edtDist_TE_t'], timeout, [/\/Interface\/Lists\/ListCommonDML\.aspx/i]);
  }

  async openNewRecord(): Promise<void> {
    const popupPromise = this.page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null);
    const frame = await this.resolveListFrame(20000);
    const action = frame.getByRole('cell', { name: /\bYeni\b/i }).first();
    await action.waitFor({ state: 'visible', timeout: 10000 });
    await action.click({ force: true }).catch(async () => {
      await frame.locator(this.S_NEW_ACTION).first().click({ force: true });
    });
    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
      this.page = popup;
    } else {
      this.page = this.getActivePage([/\/Interface\/Lists\/ListCommonDML\.aspx/i]);
    }
    await this.resolveFormFrame(15000);
  }

  async fillHeaderLookups(): Promise<void> {
    await this.selectLookupByKey('DistKod');
    await this.selectLookupByKey('TXTGRUPKOD');
    await this.selectLookupByKey('TXTEKGRUPKOD');
  }

  async fillField(selector: string, value: string): Promise<void> {
    const frame = await this.resolveFormFrame(10000);
    await this.fillRobustInFrame(frame, selector, value);
  }

  async saveAndClose(): Promise<void> {
    const btn = this.page.locator(this.S_SAVE).first();
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.hover({ timeout: 2000 }).catch(() => {});
    for (let attempt = 0; attempt < 4; attempt++) {
      await btn.click({ force: true });
      const closed = await this.page.waitForEvent('close', { timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (closed || this.page.isClosed()) return;
    }
    throw new Error(`Form kapatilamadi: ${this.S_SAVE}`);
  }

  async assertReady(): Promise<void> {
    await this.assertFormClosed();
    const frame = await this.resolveListFrame(15000);
    await expect(frame.locator(this.S_LIST_HEADER).first()).toBeVisible();
  }

  async selectLookupByKey(key: string): Promise<void> {
    const hint = this.lookupMap.get(key);
    if (!hint) throw new Error(`Lookup bulunamadi: ${key}`);
    await this.useLookupByValueWithFallback(hint.btn, hint.input, hint.value, 8000);
    const frame = await this.resolveFormFrame(5000);
    const actual = await frame.locator(hint.input).first().inputValue();
    expect(actual.toLowerCase()).toContain(hint.value.toLowerCase());
  }
}
