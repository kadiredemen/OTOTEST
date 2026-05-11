import { test } from '../fixtures/base.fixture';
import { DepocikisislemiPage } from '../../pages/DepocikisislemiPage';

/** Otomatik uretildi - 2026-05-11 */
// Plan: recordings\depocikisislemiduzenle-plan.json
test.describe('Depocikisislemiduzenle', () => {
  test('Depocikisislemiduzenle akisi', async ({ page }) => {
    test.setTimeout(120000);
    const erp = new DepocikisislemiPage(page);

    await test.step('Listeyi acar', async () => {
      await erp.openList();
    });
    await test.step('Kaydi duzenlemeye alir', async () => {
      await erp.openSelectedRecord();
    });
    await test.step('Detay miktarini duzenler', async () => {
      await erp.editDetailQuantity('3.00');
    });
    await test.step('Kaydeder ve kapatir', async () => {
      await erp.saveAndClose();
    });
    await test.step('Dogrulama', async () => {
      await erp.assertReady();
    });
  });
});
