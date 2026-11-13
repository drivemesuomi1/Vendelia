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
export function sessionToken(cookie: string | undefined): string | undefined {
  const value = cookie?.split(';').map(v => v.trim()).find(v => v.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : undefined;
}
export function sessionCookie(token: string, secure: boolean, maxAge = SESSION_SECONDS): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}
