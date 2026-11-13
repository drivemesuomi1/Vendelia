export interface AuthConfig { url: string; key: string; secure: boolean; origins: string[]; siteUrl: string }
export function authConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const url = env.SUPABASE_URL?.trim().replace(/\/+$/, '') ?? '';
  if (url && new URL(url).protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
    throw new Error('SUPABASE_URL must use HTTPS');
  }
  return {
    url, key: env.SUPABASE_PUBLISHABLE_KEY?.trim() ?? '', secure: env.NODE_ENV === 'production',
    origins: [env.FRONTEND_URL || 'http://localhost:3000', env.PUBLIC_SITE_URL || 'https://www.vendelia.fi']
      .map(value => new URL(value).origin),
    // Where Google sign-in returns to: the public site in production, the local frontend in development.
    siteUrl: new URL(env.NODE_ENV === 'production' ? env.PUBLIC_SITE_URL || 'https://www.vendelia.fi' : env.FRONTEND_URL || 'http://localhost:3000').origin,
  };
}
export const SESSION_COOKIE = 'vd_session';
export const OAUTH_COOKIE = 'vd_oauth';
export const SESSION_SECONDS = 8 * 60 * 60;
/** "Remember me": how long a customer stays signed in on this device. */
export const REMEMBER_SECONDS = 30 * 24 * 60 * 60;
export function sessionToken(cookie: string | undefined): string | undefined {
  const value = cookie?.split(';').map(v => v.trim()).find(v => v.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : undefined;
}
/** maxAge null makes a browser-session cookie: it is dropped when the browser closes. */
export function sessionCookie(token: string, secure: boolean, maxAge: number | null = SESSION_SECONDS): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict${maxAge === null ? '' : `; Max-Age=${maxAge}`}${secure ? '; Secure' : ''}`;
}
/**
 * Session length and cookie lifetime for a sign-in. Without a choice (staff and business sign-ins) the session
 * lasts 8 hours as before; "remember me" keeps it 30 days; otherwise it ends with the browser, at most 8 hours.
 */
export function sessionLength(remember: boolean | undefined): { seconds: number; cookieMaxAge: number | null } {
  if (remember === undefined) return { seconds: SESSION_SECONDS, cookieMaxAge: SESSION_SECONDS };
  return remember ? { seconds: REMEMBER_SECONDS, cookieMaxAge: REMEMBER_SECONDS } : { seconds: SESSION_SECONDS, cookieMaxAge: null };
}
