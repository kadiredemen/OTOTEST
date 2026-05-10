import { test } from '../fixtures/base.fixture';
import { AlissiparisiPage } from '../../pages/AlissiparisiPage';

/** Otomatik uretildi - 2026-05-10 */
// Plan: recordings\alissiparisiolusturma-plan.json
test.describe('Alissiparisiolusturma', () => {
  test('Alissiparisiolusturma akisi', async ({ page }) => {
    test.setTimeout(120000);
    const erp = new AlissiparisiPage(page);

    await test.step('Listeyi acar', async () => {
      await erp.openList();
    });
    await test.step('Yeni kayit baslatir', async () => {
      await erp.openNewRecord();
    });
    await test.step('Distkod lookup secer', async () => {
      await erp.selectLookupByKey('DistKod');
    });
    await test.step('Mustkod lookup secer', async () => {
      await erp.selectLookupByKey('MustKod');
    });
    await test.step('Detay satiri ekler', async () => {
      await erp.addDetail('10');
    });
    await test.step('Kaydeder ve kapatir', async () => {
      await erp.saveAndClose();
    });
    await test.step('Dogrulama', async () => {
      await erp.assertReady();
    });
  });
});
