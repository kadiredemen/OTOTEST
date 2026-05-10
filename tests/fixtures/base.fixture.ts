import { test as base, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import { LookupAuditEntry, LookupHelper } from '../../runtime/LookupHelper';

type NetworkEvent = {
  kind: 'request' | 'response' | 'requestfailed';
  method?: string;
  url: string;
  status?: number;
  resourceType?: string;
  failureText?: string;
  timestamp: string;
};

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const consoleLogs: string[] = [];
    const networkLogs: NetworkEvent[] = [];
    const MAX_NETWORK_EVENTS = 2000;
    LookupHelper.clearAuditLog();

    page.on('console', (msg) => {
      consoleLogs.push(
        `[${new Date().toISOString()}] [${msg.type().toUpperCase()}] ${msg.text()}`
      );
    });

    page.on('request', (req) => {
      if (networkLogs.length >= MAX_NETWORK_EVENTS) return;
      networkLogs.push({
        kind: 'request',
        method: req.method(),
        url: req.url(),
        resourceType: req.resourceType(),
        timestamp: new Date().toISOString()
      });
    });

    page.on('response', (res) => {
      if (networkLogs.length >= MAX_NETWORK_EVENTS) return;
      const status = res.status();
      if (status >= 400 || ['xhr', 'fetch'].includes(res.request().resourceType())) {
        networkLogs.push({
          kind: 'response',
          method: res.request().method(),
          url: res.url(),
          status,
          resourceType: res.request().resourceType(),
          timestamp: new Date().toISOString()
        });
      }
    });

    page.on('requestfailed', (req) => {
      if (networkLogs.length >= MAX_NETWORK_EVENTS) return;
      networkLogs.push({
        kind: 'requestfailed',
        method: req.method(),
        url: req.url(),
        resourceType: req.resourceType(),
        failureText: req.failure()?.errorText,
        timestamp: new Date().toISOString()
      });
    });

    const baseUrl = process.env.BASE_URL ?? 'https://testotomasyon.univera.com.tr:8350/';
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await use(page);

    const failed = testInfo.status !== testInfo.expectedStatus;
    if (!failed) return;

    const consolePath = testInfo.outputPath('console.log');
    await fs.writeFile(consolePath, consoleLogs.join('\n') || '(no console logs)', 'utf8');
    await testInfo.attach('console-log', {
      path: consolePath,
      contentType: 'text/plain'
    });

    const networkPath = testInfo.outputPath('network.json');
    await fs.writeFile(networkPath, JSON.stringify(networkLogs, null, 2), 'utf8');
    await testInfo.attach('network-log', {
      path: networkPath,
      contentType: 'application/json'
    });

    const lookupAudit = LookupHelper.getAuditLog();
    const lookupAuditPath = testInfo.outputPath('lookup-audit.json');
    await fs.writeFile(lookupAuditPath, JSON.stringify(lookupAudit, null, 2), 'utf8');
    await testInfo.attach('lookup-audit', {
      path: lookupAuditPath,
      contentType: 'application/json'
    });

    const lookupAuditMdPath = testInfo.outputPath('lookup-audit.md');
    await fs.writeFile(lookupAuditMdPath, formatLookupAudit(lookupAudit), 'utf8');
    await testInfo.attach('lookup-audit-summary', {
      path: lookupAuditMdPath,
      contentType: 'text/markdown'
    });
  }
});

export { expect };

function formatLookupAudit(entries: LookupAuditEntry[]): string {
  if (entries.length === 0) return '# Lookup audit\n\n(no lookup events)';

  const lines = ['# Lookup audit', ''];
  for (const entry of entries) {
    const selectorInfo = [
      entry.lookupKey ? `key=${entry.lookupKey}` : null,
      entry.expectedValue ? `value=${entry.expectedValue}` : null,
      entry.inputSelector ? `input=${entry.inputSelector}` : null,
      entry.buttonSelector ? `button=${entry.buttonSelector}` : null,
    ].filter(Boolean).join(' | ');

    lines.push(`- ${entry.timestamp} [${entry.status}] ${entry.action}${selectorInfo ? ` (${selectorInfo})` : ''}`);
    if (entry.detail) lines.push(`  detail: ${entry.detail}`);
    if (entry.error) lines.push(`  error: ${entry.error.split('\n')[0]}`);
  }

  return `${lines.join('\n')}\n`;
}
