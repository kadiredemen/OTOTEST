import { expect, Frame, Page } from '@playwright/test';
import { BasePage } from '../runtime/BasePage';

/** Otomatik uretildi - 2026-05-10 */
export class AlissiparisiPage extends BasePage {
  private readonly lookupMap = new Map<string, { input: string; btn: string; value: string }>([
    ['DistKod', { input: '#MCC_edtDistKod_TE_t', btn: '#MCC_edtDistKod_TE_b0 > img', value: '1001' }],
    ['MustKod', { input: '#MCC_edtMustKod_TE_t', btn: '#MCC_edtMustKod_TE_b0 > img', value: 'TEST MÜŞTERİ_3' }],
    ['UrunKod', { input: '#DCC_DetGrd_RT_edtDetUrunKod_TE_t', btn: '#DCC_DetGrd_RT_edtDetUrunKod_TE_b0 > img', value: 'TS1_118_2' }],
  ]);

  private readonly S_MENU_0 = 'a > span[data-menu-kod="1202"]';
  private readonly S_MENU_1 = 'a > span[data-menu-kod="1216"]';
  private readonly S_MENU_2 = 'a > span[data-menu-kod="1217"]';
  private readonly S_LIST_HEADER = '#ListGrid_R0 > th';
  private readonly S_NEW_ACTION = '#NvgxToolbar_Item_1 > span';
  private readonly S_DISTKOD_INPUT = '#MCC_edtDistKod_TE_t';
  private readonly S_DISTKOD_BTN = '#MCC_edtDistKod_TE_b0 > img';
  private readonly S_MUSTKOD_INPUT = '#MCC_edtMustKod_TE_t';
  private readonly S_MUSTKOD_BTN = '#MCC_edtMustKod_TE_b0 > img';
  private readonly S_ADDDETAIL_TRIGGER = '#DCCxGridNvgxToolbar_Item_1 > span';
  private readonly S_ADDDETAIL_EDITOR = '#DCC_DetGrd_RT_edtDetUrunKod_TE_t';
  private readonly S_ADDDETAIL_QTY = '#DCC_DetGrd_RT_edtDetMik_NBE_t';
  private readonly S_ADDDETAIL_OK = '#DCC_DetGrd_RT_DCC_DetGrdBtnOK';
  private readonly S_ADDDETAIL_ROW = '#DCC_DetGrd_R0 > th';
  private readonly S_SAVE = '#MainNvgxToolbar_Item_1 > span';
  private readonly S_CLOSE = '#MainNvgxToolbar_Item_0 > span';

  constructor(page: Page) { super(page); }

  async openList(): Promise<void> {
    await this.ensureSubMenuVisible(this.S_MENU_0, this.S_MENU_1);
    await this.ensureSubMenuVisible(this.S_MENU_1, this.S_MENU_2);
    await this.clickVisibleWithFallback(this.S_MENU_2);
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  private async resolveListFrame(timeout = 15000): Promise<Frame> {
    this.page = this.getActivePage([/\/Interface\/MobilSatisDagitim\/SiparisAlisExtDMLList\.aspx/i]);
    return this.resolveFrameByAnyVisibleMarker([this.S_LIST_HEADER], timeout, [/\/Interface\/MobilSatisDagitim\/SiparisAlisExtDMLList\.aspx/i]);
  }

  private async resolveFormFrame(timeout = 15000): Promise<Frame> {
    this.page = this.getActivePage([/\/Interface\/MobilSatisDagitim\/SiparisAlisExtDML\.aspx/i]);
    return this.resolveFrameByAnyVisibleMarker(['#MCC_edtDistKod_TE_t'], timeout, [/\/Interface\/MobilSatisDagitim\/SiparisAlisExtDML\.aspx/i]);
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
      this.page = this.getActivePage([/\/Interface\/MobilSatisDagitim\/SiparisAlisExtDML\.aspx/i]);
    }
    await this.resolveFormFrame(15000);
  }

  async fillHeaderLookups(): Promise<void> {
    await this.selectLookupByKey('DistKod');
    await this.selectLookupByKey('MustKod');
  }

  async addDetail(quantity = '100'): Promise<void> {
    const frame = await this.resolveFormFrame(10000);
    await this.ensureEditorVisibleAfterTriggerInFrame(
      frame, this.S_ADDDETAIL_TRIGGER, this.S_ADDDETAIL_EDITOR, { attempts: 3, timeoutPerAttempt: 5000 }
    );
    await this.selectLookupByKey('UrunKod');
    await this.fillRobustInFrame(frame, this.S_ADDDETAIL_QTY, quantity);
    await frame.locator(this.S_ADDDETAIL_QTY).first().press('Tab');
    await this.commitDetailRowByProofsInFrame(frame, {
      okButtonSelector: this.S_ADDDETAIL_OK,
      rowProofSelector: this.S_ADDDETAIL_ROW,
      retries: 2,
      timeout: 10000,
      proofSelectors: [
        { selector: '#DCC_DetGrd_R0 > th', state: 'visible' as const },
        { selector: '#DCC_DetGrd_RT_DCC_DetGrdBtnOK', state: 'hidden' as const },
        { selector: '#DCC_DetGrd_RT_edtDetMik_NBE_t', state: 'hidden' as const },
        { selector: '#DCC_DetGrd_RT_TBL', state: 'hidden' as const },
      ],
    });
  }

  async fillField(selector: string, value: string): Promise<void> {
    const frame = await this.resolveFormFrame(10000);
    await this.fillRobustInFrame(frame, selector, value);
  }

  async saveAndClose(): Promise<void> {
    await this.saveAndCloseWithRetry(this.S_SAVE, this.S_CLOSE, 4);
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
