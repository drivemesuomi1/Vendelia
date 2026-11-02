"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import type { SessionUserDTO } from '@vendelia/shared';
import { Icon } from '@/components/ui/Icon';
import { LogoSymbol } from '@/components/ui/Logo';
import { LangSwitch } from '@/components/layout/LangSwitch';
import { PortalShell } from '@/components/layout/PortalShell';
import { useI18n } from '@/i18n/I18nProvider';
import { ApiError } from '@/lib/api-client';
import { merchantLogin, logout } from '@/features/auth/api';

/** Real business identity comes only from the server session, never from localStorage. */
export function BusinessGate({ user, children }: { user: SessionUserDTO | null; children: ReactNode }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const business = user?.role === 'merchant' ? user.merchant : null;
  const failure = (error: unknown) => t(`errors.${error instanceof ApiError ? error.code : 'network'}`);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      await merchantLogin({ email, password });
      setPassword(''); router.refresh();
    } catch (error) { setError(failure(error)); }
    finally { setBusy(false); }
  };
  const signOut = async () => {
    setError(null);
    try { await logout(); router.refresh(); }
    catch (error) { setError(failure(error)); }
  };

  if (business && user) return (
    <PortalShell kind="business" account={{ title: business.name, lines: [`${t('common.businessId')} ${business.businessId}`, user.name, user.email], onSignOut: signOut }}>
      {error && <p className="review-note" role="alert">{error}</p>}
      {business.status === 'pending' && <p className="review-note warn">{t('business.pendingAccount')}</p>}
      {children}
    </PortalShell>
  );

  return (
    <main className="alogin">
      <aside className="alogin-brand" aria-hidden="true">
        <div className="alogin-mark"><LogoSymbol height={32} tight /></div>
        <div><p className="alogin-eyebrow">Vendelia</p><p className="alogin-claim">{t('business.login.claim')}</p></div>
        <p className="alogin-foot">© Mansio Group Oy</p>
      </aside>
      <section className="alogin-main">
        <div className="alogin-top"><Link className="alogin-back" href={`/${locale}`}><Icon name="left" />{t('business.backToSite')}</Link><LangSwitch /></div>
        <form className="alogin-form" onSubmit={submit} noValidate>
          <div className="alogin-mobile-mark"><LogoSymbol height={32} /></div>
          <h1>{t('business.login.title')}</h1>
          <p className="muted">{t('business.login.subtitle')}</p>
          {error && <p className="alogin-err" role="alert"><Icon name="xc" />{error}</p>}
          <label className="afield">
            <span>{t('admin.mb.loginEmail')}</span>
            <span className="afield-box"><Icon name="mail" /><input type="email" autoComplete="username" autoFocus required value={email} onChange={event => setEmail(event.target.value)} /></span>
          </label>
          <label className="afield">
            <span>{t('auth.password')}</span>
            <span className="afield-box"><Icon name="lock" /><input type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
              <button type="button" className="afield-eye" onClick={() => setShow(value => !value)} aria-pressed={show}>{t(show ? 'admin.login.hide' : 'admin.login.show')}</button>
            </span>
          </label>
          <button className="btn btn-primary btn-block" type="submit" disabled={busy || !email || !password}>{busy ? t('admin.login.signingIn') : t('auth.login')}</button>
          <p className="alogin-note"><Icon name="info" />{t('business.login.noAccount')}</p>
        </form>
      </section>
    </main>
  );
}
