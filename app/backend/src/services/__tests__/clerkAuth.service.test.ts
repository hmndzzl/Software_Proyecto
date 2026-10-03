import { describe, it, expect, vi, beforeEach } from 'vitest';
import pool from '../../config/db';
import { getClerkClient } from '../../config/clerk';
import { resolvePersonaFromClerk } from '../clerkAuth.service';
import { ROLES } from '../../config/roles';

vi.mock('../../config/db', () => ({
  default: { execute: vi.fn() },
}));

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock('../../config/clerk', () => ({
  getClerkClient: vi.fn(() => ({ users: { getUser } })),
}));

const clerkUser = (emails: Array<{ emailAddress: string; status: string }>) => ({
  emailAddresses: emails.map((e) => ({ emailAddress: e.emailAddress, verification: { status: e.status } })),
});

describe('resolvePersonaFromClerk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('usa la persona ya vinculada por clerk_user_id sin consultar a Clerk', async () => {
    (pool.execute as any).mockResolvedValueOnce([[{ id: 4, rol_id: ROLES.MINISTRO }]]);

    const persona = await resolvePersonaFromClerk('user_abc');

    expect(persona).toEqual({ id: 4, rol_id: ROLES.MINISTRO });
    expect(getClerkClient).not.toHaveBeenCalled();
  });

  it('vincula por correo verificado la primera vez y conserva el rol', async () => {
    (pool.execute as any)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 2, rol_id: ROLES.SACERDOTE }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    getUser.mockResolvedValue(clerkUser([{ emailAddress: 'Padre@Parroquia.com', status: 'verified' }]));

    const persona = await resolvePersonaFromClerk('user_abc');

    expect(persona).toEqual({ id: 2, rol_id: ROLES.SACERDOTE });
    expect((pool.execute as any).mock.calls[1][1]).toEqual(['padre@parroquia.com']);
    expect((pool.execute as any).mock.calls[2][1]).toEqual(['user_abc', 2]);
  });

  it('no vincula correos sin verificar', async () => {
    (pool.execute as any).mockResolvedValueOnce([[]]);
    getUser.mockResolvedValue(clerkUser([{ emailAddress: 'x@parroquia.com', status: 'unverified' }]));

    expect(await resolvePersonaFromClerk('user_abc')).toBeNull();
    expect(pool.execute).toHaveBeenCalledTimes(1);
  });

  it('retorna null si no hay persona con ese correo', async () => {
    (pool.execute as any).mockResolvedValueOnce([[]]).mockResolvedValueOnce([[]]);
    getUser.mockResolvedValue(clerkUser([{ emailAddress: 'nuevo@gmail.com', status: 'verified' }]));

    expect(await resolvePersonaFromClerk('user_abc')).toBeNull();
  });

  it('retorna null si otra petición vinculó la persona primero', async () => {
    (pool.execute as any)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 2, rol_id: ROLES.SACERDOTE }]])
      .mockResolvedValueOnce([{ affectedRows: 0 }]);
    getUser.mockResolvedValue(clerkUser([{ emailAddress: 'padre@parroquia.com', status: 'verified' }]));

    expect(await resolvePersonaFromClerk('user_abc')).toBeNull();
  });
});
