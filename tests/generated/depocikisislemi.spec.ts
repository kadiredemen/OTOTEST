import { test } from '../fixtures/base.fixture';
import { DepocikisislemiPage } from '../../pages/DepocikisislemiPage';

/** Otomatik uretildi - 2026-05-10 */
// Plan: recordings\depocikisislemi-plan.json
test.describe('Depocikisislemi', () => {
  test('Depocikisislemi akisi', async ({ page }) => {
    test.setTimeout(120000);
    const erp = new DepocikisislemiPage(page);

    await test.step('Listeyi acar', async () => {
      await erp.openList();
    });
    await test.step('Yeni kayit baslatir', async () => {
      await erp.openNewRecord();
    });
    await test.step('Distkod lookup secer', async () => {
      await erp.selectLookupByKey('DistKod');
    });
    await test.step('Cikisdepokod lookup secer', async () => {
      await erp.selectLookupByKey('CikisDepoKod');
    });
    await test.step('Detay satiri ekler', async () => {
      await erp.addDetail('2.00');
    });
    await test.step('Kaydeder ve kapatir', async () => {
      await erp.saveAndClose();
    });
    await test.step('Dogrulama', async () => {
      await erp.assertReady();
    });
  });
});
