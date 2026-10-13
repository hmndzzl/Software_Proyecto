import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../../config/db';
import { isClerkEnabled } from '../../config/clerk';
import { HttpStatus } from '../../utils/httpStatus';
import { ROLES } from '../../config/roles';
import { register } from '../auth.controller';

vi.mock('../../config/db', () => ({ default: { execute: vi.fn() } }));
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn(), compare: vi.fn() } }));
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn(), verify: vi.fn() } }));

const { createUser } = vi.hoisted(() => ({ createUser: vi.fn() }));
vi.mock('../../config/clerk', () => ({
  isClerkEnabled: vi.fn(),
  getClerkClient: vi.fn(() => ({ users: { createUser } })),
}));

describe('register - creación del usuario en Clerk', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: any;
  let jsonMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    res = { status: statusMock, json: jsonMock };
    req = {
      user: { id: 1, rol_id: ROLES.ADMIN },
      body: { nombre: 'Luis Pérez', correo: 'luis@test.com', password: 'Clave-Segura-1', rol_id: ROLES.MINISTRO },
    };
    (isClerkEnabled as any).mockReturnValue(true);
    (bcrypt.hash as any).mockResolvedValue('hash_bcrypt');
    (pool.execute as any)
      .mockResolvedValueOnce([[]]) // correo libre
      .mockResolvedValueOnce([{ insertId: 11 }]) // INSERT persona
      .mockResolvedValue([{ affectedRows: 1 }]); // UPDATE clerk_user_id
  });

  it('crea el usuario en Clerk sin externalId (un id repetido hacía que Clerk lo rechazara) y lo vincula', async () => {
    createUser.mockResolvedValue({ id: 'user_nuevo' });

    await register(req as Request, res as Response);

    expect(createUser).toHaveBeenCalledWith({
      emailAddress: ['luis@test.com'],
      firstName: 'Luis Pérez',
      passwordDigest: 'hash_bcrypt',
      passwordHasher: 'bcrypt',
    });
    expect(createUser.mock.calls[0][0]).not.toHaveProperty('externalId');
    expect(pool.execute).toHaveBeenCalledWith('UPDATE persona SET clerk_user_id = ? WHERE id = ?', ['user_nuevo', 11]);
    expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
    expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Usuario registrado exitosamente' });
  });

  it('si Clerk falla, la cuenta se crea igual pero la respuesta trae una advertencia con el motivo', async () => {
    createUser.mockRejectedValue({ errors: [{ longMessage: 'That email address is taken.' }] });

    await register(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
    const cuerpo = jsonMock.mock.calls[0][0];
    expect(cuerpo.mensaje).toBe('Usuario registrado exitosamente');
    expect(cuerpo.advertencia).toContain('That email address is taken.');
  });

  it('sin Clerk configurado no intenta crear el usuario ni agrega advertencia', async () => {
    (isClerkEnabled as any).mockReturnValue(false);

    await register(req as Request, res as Response);

    expect(createUser).not.toHaveBeenCalled();
    expect(jsonMock).toHaveBeenCalledWith({ mensaje: 'Usuario registrado exitosamente' });
  });
});
