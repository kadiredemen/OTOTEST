import { test } from '../fixtures/base.fixture';
import { MusteritanimlamaPage } from '../../pages/MusteritanimlamaPage';

/** Otomatik uretildi - 2026-05-10 */
// Plan: recordings\musteritanimlama-plan.json
test.describe('Musteritanimlama', () => {
  test('Musteritanimlama akisi', async ({ page }) => {
    test.setTimeout(120000);
    const erp = new MusteritanimlamaPage(page);

    await test.step('Listeyi acar', async () => {
      await erp.openList();
    });
    await test.step('Yeni kayit baslatir', async () => {
      await erp.openNewRecord();
    });
    await test.step('Distkod lookup secer', async () => {
      await erp.selectLookupByKey('DistKod');
    });
    await test.step('Unvan alanini doldurur', async () => {
      await erp.fillField('#edtUnvan_TE_t', 'MK0001');
    });
    await test.step('Kisa Ad alanini doldurur', async () => {
      await erp.fillField('#TABCtrl_WT__ctl0_WGB_GenelBilgiler_edtKisaAd_TE_t', 'MK0001');
    });
    await test.step('Txtgrupkod lookup secer', async () => {
      await erp.selectLookupByKey('TXTGRUPKOD');
    });
    await test.step('Txtekgrupkod lookup secer', async () => {
      await erp.selectLookupByKey('TXTEKGRUPKOD');
    });
    await test.step('Cep Tel alanini doldurur', async () => {
      await erp.fillField('#igtxtTABCtrl_WT__ctl0_WGB_IletisimBilgileri_edtCepTel_ME', '(555)555 55 55');
    });
    await test.step('Kaydeder ve kapatir', async () => {
      await erp.saveAndClose();
    });
    await test.step('Dogrulama', async () => {
      await erp.assertReady();
    });
  });
});
