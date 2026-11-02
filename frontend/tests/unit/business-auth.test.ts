import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import type { SessionUserDTO } from '@vendelia/shared';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ locale: 'en', t: (key: string) => key }) }));
vi.mock('@/components/layout/LangSwitch', () => ({ LangSwitch: () => null }));
vi.mock('@/components/layout/PortalShell', () => ({
  PortalShell: ({ account, children }: { account: { title: string; lines: string[] }; children: ReactNode }) =>
    createElement('section', null, account.title, ...account.lines, children),
}));
import { BusinessGate } from '../../src/features/merchant/components/BusinessGate';
const merchant = { id: 'business-a', name: 'Saved Business A', companyName: 'A Oy', businessId: '1234567-1', status: 'active' };
const user: SessionUserDTO = { id: 'auth-user', name: 'Contact Person', email: 'contact@example.com', role: 'merchant', merchant };
const render = (user: SessionUserDTO | null) => renderToStaticMarkup(createElement(BusinessGate, { user, children: 'protected-dashboard' }));
it('renders the real merchant identity and owned portal content', () => {
  const html = render(user);
  expect(html).toContain('Saved Business A'); expect(html).toContain('Contact Person');
  expect(html).toContain('contact@example.com'); expect(html).toContain('protected-dashboard');
  expect(html).not.toContain('business.login.title');
});
it('does not expose portal children without a linked merchant session', () => {
  for (const value of [null, { ...user, merchant: null }, { ...user, role: 'customer' as const }, { ...user, role: 'admin' as const }]) {
    const html = render(value);
    expect(html).toContain('business.login.title'); expect(html).not.toContain('protected-dashboard');
    expect(html).not.toContain('Saved Business A'); expect(html).not.toContain('admin.login.dev');
  }
});
