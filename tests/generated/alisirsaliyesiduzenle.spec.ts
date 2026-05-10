import { test } from '../fixtures/base.fixture';
import { AlisirsaliyesiPage } from '../../pages/AlisirsaliyesiPage';

/** Otomatik uretildi - 2026-05-10 */
// Plan: recordings\alisirsaliyesiduzenle-plan.json
test.describe('Alisirsaliyesiduzenle', () => {
  test('Alisirsaliyesiduzenle akisi', async ({ page }) => {
    test.setTimeout(120000);
    const erp = new AlisirsaliyesiPage(page);

    await test.step('Listeyi acar', async () => {
      await erp.openList();
    });
    await test.step('Kaydi duzenlemeye alir', async () => {
      await erp.openSelectedRecord();
    });
    await test.step('Detay miktarini duzenler', async () => {
      await erp.editDetailQuantity('102');
    });
    await test.step('Kaydeder ve kapatir', async () => {
      await erp.saveAndClose();
    });
    await test.step('Dogrulama', async () => {
      await erp.assertReady();
    });
  });
});
