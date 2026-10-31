import { beforeEach, expect, it, vi } from 'vitest';
const { backendRequest, getSession, serverApi, set, remove, redirect } = vi.hoisted(() => ({
  backendRequest: vi.fn(), getSession: vi.fn(), serverApi: vi.fn(), set: vi.fn(), remove: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ set, delete: remove, toString: () => 'vd_session=old' }) }));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/lib/backend-request', () => ({ backendRequest }));
vi.mock('@/lib/session', () => ({ getSession }));
vi.mock('@/lib/server-api', () => ({ serverApi }));
import { adminLogin, adminLogout } from '../../src/features/admin/actions';
import { getAdminSession, adminConfigured } from '../../src/lib/admin-auth';
beforeEach(() => vi.clearAllMocks());
function form() { const f = new FormData(); f.set('email', 'staff@example.com'); f.set('password', 'secret'); return f; }
it('uses the backend admin login and sets only a secure session cookie after success', async () => {
  backendRequest.mockResolvedValue(new Response('{}', { headers: { 'set-cookie': `vd_session=${'a'.repeat(64)}; Path=/; HttpOnly` } }));
  await expect(adminLogin(null, form())).rejects.toThrow('redirect:/admin');
  expect(backendRequest).toHaveBeenCalledWith('/api/auth/admin/login', expect.objectContaining({ method: 'POST' }));
  expect(set).toHaveBeenCalledWith('vd_session', 'a'.repeat(64), expect.objectContaining({ httpOnly: true, sameSite: 'strict', maxAge: 28800 }));
});
it('rejects bad credentials and outages without creating a cookie', async () => {
  backendRequest.mockResolvedValue(new Response('{}', { status: 401 }));
  expect(await adminLogin(null, form())).toEqual({ error: 'invalid' });
  backendRequest.mockResolvedValue(new Response('{}', { status: 429 }));
  expect(await adminLogin(null, form())).toEqual({ error: 'tooManyAttempts' });
  backendRequest.mockRejectedValue(new Error('unreachable'));
  expect(await adminLogin(null, form())).toEqual({ error: 'unavailable' });
  expect(set).not.toHaveBeenCalled();
});
it('checks the current server role rather than accepting the old admin cookie', async () => {
  getSession.mockResolvedValue({ email: 'buyer@example.com', role: 'customer' });
  expect(await getAdminSession()).toBeNull();
  const admin = { email: 'staff@example.com', name: 'Vendelia Admin', role: 'admin' };
  getSession.mockResolvedValue(admin);
  expect(await getAdminSession()).toEqual(admin);
  getSession.mockResolvedValue(null); expect(await getAdminSession()).toBeNull();
});
it('revokes backend session on logout and clears both current and retired cookies', async () => {
  backendRequest.mockResolvedValue(new Response('{}'));
  await expect(adminLogout()).rejects.toThrow('redirect:/admin');
  expect(backendRequest).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }));
  expect(remove).toHaveBeenCalledWith('vd_session'); expect(remove).toHaveBeenCalledWith('vd_admin');
});
it('does not report successful logout or configuration on backend failure', async () => {
  backendRequest.mockResolvedValue(new Response('{}', { status: 503 }));
  await expect(adminLogout()).rejects.toThrow('Sign out could not be completed');
  expect(remove).not.toHaveBeenCalled();
  serverApi.mockRejectedValue(new Error('unreachable')); expect(await adminConfigured()).toBe(false);
});
