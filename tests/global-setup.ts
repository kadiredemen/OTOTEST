import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function globalSetup() {
  const username = process.env.ERP_USERNAME?.trim();
  const password = process.env.ERP_PASSWORD?.trim();
  const baseUrl = process.env.BASE_URL ?? 'https://testotomasyon.univera.com.tr:8350/';

  if (!username || !password) {
    throw new Error('ERP_USERNAME ve ERP_PASSWORD .env dosyasında tanımlı olmalıdır.');
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('#edtUserName').waitFor({ state: 'visible', timeout: 30000 });

  const isLoggedInUrl = (url: string) =>
    /Default\.aspx/i.test(url) ||
    (/univera|8350/i.test(url) && !/[Ll]ogin/i.test(url) && url !== baseUrl && url !== baseUrl + '/');

  const usernameField = page.locator('#edtUserName');
  await usernameField.click({ force: true });
  await usernameField.clear();
  await usernameField.pressSequentially(username, { delay: 80 });
  await usernameField.press('Tab');

  const passwordField = page.locator('#edtPass');
  await passwordField.click({ force: true });
  await passwordField.clear();
  await passwordField.pressSequentially(password, { delay: 80 });

  const popupPromise = context.waitForEvent('page', { timeout: 8000 }).catch(() => null);
  await page.locator('#btnLogin').click({ force: true });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

  // Ana sayfa zaten dogru URL'deyse popup beklemeye gerek yok
  const currentPageOk = isLoggedInUrl(page.url());
  const popup = currentPageOk ? null : await popupPromise;

  let popupOk = false;
  if (popup) {
    await popup.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    popupOk = isLoggedInUrl(popup.url());
  }

  if (!currentPageOk && !popupOk) {
    throw new Error(
      `Login sonrasi beklenen sayfaya ulasilamadi.\n` +
      `  Mevcut sayfa URL: ${page.url()}\n` +
      `  Popup URL: ${popup ? popup.url() : '(popup yok)'}`,
    );
  }

  await context.storageState({ path: 'auth/user.json' });
  await browser.close();
}

export default globalSetup;
