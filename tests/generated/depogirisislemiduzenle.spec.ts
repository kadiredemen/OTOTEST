import { test } from '../fixtures/base.fixture';
import { DepogirisislemiPage } from '../../pages/DepogirisislemiPage';

/** Otomatik uretildi - 2026-05-11 */
// Plan: recordings\depogirisislemiduzenle-plan.json
test.describe('Depogirisislemiduzenle', () => {
  test('Depogirisislemiduzenle akisi', async ({ page }) => {
    test.setTimeout(120000);
    const erp = new DepogirisislemiPage(page);

    await test.step('Listeyi acar', async () => {
      await erp.openList();
    });
    await test.step('Kaydi duzenlemeye alir', async () => {
      await erp.openSelectedRecord();
    });
    await test.step('Detay miktarini duzenler', async () => {
      await erp.editDetailQuantity('99.00');
    });
    await test.step('Kaydeder ve kapatir', async () => {
      await erp.saveAndClose();
    });
    await test.step('Dogrulama', async () => {
      await erp.assertReady();
    });
  });
});
