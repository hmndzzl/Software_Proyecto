import { describe, it, expect, vi, beforeEach } from 'vitest';
import pool from '../../config/db';
import { getClerkClient } from '../../config/clerk';
import { resolvePersonaFromClerk } from '../clerkAuth.service';
import { ROLES } from '../../config/roles';

vi.mock('../../config/db', () => ({
  default: { execute: vi.fn() },
}));

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hash_aleatorio') },
}));

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock('../../config/clerk', () => ({
  getClerkClient: vi.fn(() => ({ users: { getUser } })),
}));

const clerkUser = (
  emails: Array<{ emailAddress: string; status: string }>,
  nombre: { firstName?: string | null; lastName?: string | null } = {}
) => ({
  firstName: null,
  lastName: null,
  ...nombre,
  emailAddresses: emails.map((e) => ({ emailAddress: e.emailAddress, verification: { status: e.status } })),
});

describe('resolvePersonaFromClerk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('usa la persona ya vinculada por clerk_user_id sin consultar a Clerk', async () => {
    (pool.execute as any).mockResolvedValueOnce([[{ id: 4, rol_id: ROLES.MINISTRO, estado_cuenta: 'activa' }]]);

    const persona = await resolvePersonaFromClerk('user_abc');

    expect(persona).toEqual({ id: 4, rol_id: ROLES.MINISTRO, estado_cuenta: 'activa' });
    expect(getClerkClient).not.toHaveBeenCalled();
  });

  it('devuelve el estado de una cuenta vinculada que sigue pendiente', async () => {
    (pool.execute as any).mockResolvedValueOnce([[{ id: 4, rol_id: ROLES.MINISTRO, estado_cuenta: 'pendiente' }]]);

    const persona = await resolvePersonaFromClerk('user_abc');

    expect(persona).toEqual({ id: 4, rol_id: ROLES.MINISTRO, estado_cuenta: 'pendiente' });
  });

  it('vincula por correo verificado la primera vez y conserva el rol', async () => {
    (pool.execute as any)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 2, rol_id: ROLES.SACERDOTE, estado_cuenta: 'activa', clerk_user_id: null }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    getUser.mockResolvedValue(clerkUser([{ emailAddress: 'Padre@Parroquia.com', status: 'verified' }]));

    const persona = await resolvePersonaFromClerk('user_abc');

    expect(persona).toEqual({ id: 2, rol_id: ROLES.SACERDOTE, estado_cuenta: 'activa' });
    expect((pool.execute as any).mock.calls[1][1]).toEqual(['padre@parroquia.com']);
    expect((pool.execute as any).mock.calls[2][1]).toEqual(['user_abc', 2]);
  });

  it('no vincula ni crea cuentas con correos sin verificar', async () => {
    (pool.execute as any).mockResolvedValueOnce([[]]);
    getUser.mockResolvedValue(clerkUser([{ emailAddress: 'x@parroquia.com', status: 'unverified' }]));

    expect(await resolvePersonaFromClerk('user_abc')).toBeNull();
    expect(pool.execute).toHaveBeenCalledTimes(1);
  });

  it('crea una cuenta pendiente con rol Ministro cuando ninguna persona tiene ese correo', async () => {
    (pool.execute as any)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 31 }]);
    getUser.mockResolvedValue(
      clerkUser([{ emailAddress: 'Nuevo@Gmail.com', status: 'verified' }], { firstName: 'Ana', lastName: 'López' })
    );

    const persona = await resolvePersonaFromClerk('user_abc');

    expect(persona).toEqual({ id: 31, rol_id: ROLES.MINISTRO, estado_cuenta: 'pendiente' });
    const [sql, params] = (pool.execute as any).mock.calls[2];
    expect(sql).toContain('INSERT INTO persona');
    expect(params).toEqual(['Ana López', 'nuevo@gmail.com', 'hash_aleatorio', ROLES.MINISTRO, 'user_abc', 'pendiente']);
  });

  it('usa la parte local del correo como nombre si Clerk no tiene nombre', async () => {
    (pool.execute as any)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 32 }]);
    getUser.mockResolvedValue(clerkUser([{ emailAddress: 'sin.nombre@gmail.com', status: 'verified' }]));

    await resolvePersonaFromClerk('user_abc');

    expect((pool.execute as any).mock.calls[2][1][0]).toBe('sin.nombre');
  });

  it('devuelve la cuenta creada por otra petición simultánea del mismo usuario', async () => {
    (pool.execute as any)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }))
      .mockResolvedValueOnce([[{ id: 31, rol_id: ROLES.MINISTRO, estado_cuenta: 'pendiente' }]]);
    getUser.mockResolvedValue(clerkUser([{ emailAddress: 'nuevo@gmail.com', status: 'verified' }]));

    expect(await resolvePersonaFromClerk('user_abc')).toEqual({
      id: 31,
      rol_id: ROLES.MINISTRO,
      estado_cuenta: 'pendiente',
    });
  });

  it('propaga errores de la BD distintos de un duplicado', async () => {
    (pool.execute as any)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockRejectedValueOnce(new Error('BD caída'));
    getUser.mockResolvedValue(clerkUser([{ emailAddress: 'nuevo@gmail.com', status: 'verified' }]));

    await expect(resolvePersonaFromClerk('user_abc')).rejects.toThrow('BD caída');
  });

  it('no reasigna una persona que ya está vinculada a otro usuario de Clerk', async () => {
    (pool.execute as any)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 2, rol_id: ROLES.SACERDOTE, estado_cuenta: 'activa', clerk_user_id: 'user_otro' }]]);
    getUser.mockResolvedValue(clerkUser([{ emailAddress: 'padre@parroquia.com', status: 'verified' }]));

    expect(await resolvePersonaFromClerk('user_abc')).toBeNull();
    expect(pool.execute).toHaveBeenCalledTimes(2);
  });

  it('retorna null si otra petición vinculó la persona primero', async () => {
    (pool.execute as any)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 2, rol_id: ROLES.SACERDOTE, estado_cuenta: 'activa', clerk_user_id: null }]])
      .mockResolvedValueOnce([{ affectedRows: 0 }]);
    getUser.mockResolvedValue(clerkUser([{ emailAddress: 'padre@parroquia.com', status: 'verified' }]));

    expect(await resolvePersonaFromClerk('user_abc')).toBeNull();
  });
});
