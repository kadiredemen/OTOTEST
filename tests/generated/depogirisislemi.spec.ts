import { test } from '../fixtures/base.fixture';
import { DepogirisislemiPage } from '../../pages/DepogirisislemiPage';

/** Otomatik uretildi - 2026-05-11 */
// Plan: recordings\depogirisislemi-plan.json
test.describe('Depogirisislemi', () => {
  test('Depogirisislemi akisi', async ({ page }) => {
    test.setTimeout(120000);
    const erp = new DepogirisislemiPage(page);

    await test.step('Listeyi acar', async () => {
      await erp.openList();
    });
    await test.step('Yeni kayit baslatir', async () => {
      await erp.openNewRecord();
    });
    await test.step('Distkod lookup secer', async () => {
      await erp.selectLookupByKey('DistKod');
    });
    await test.step('Girisdepokod lookup secer', async () => {
      await erp.selectLookupByKey('GirisDepoKod');
    });
    await test.step('Detay satiri ekler', async () => {
      await erp.addDetail('100.00');
    });
    await test.step('Kaydeder ve kapatir', async () => {
      await erp.saveAndClose();
    });
    await test.step('Dogrulama', async () => {
      await erp.assertReady();
    });
  });
});
