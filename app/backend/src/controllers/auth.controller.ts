import { Request, Response } from 'express';
import pool from '../config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { HttpStatus } from '../utils/httpStatus';
import { JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN } from '../config/env';
import { isClerkEnabled, getClerkClient } from '../config/clerk';

const REFRESH_MAX_AGE = 15 * 24 * 60 * 60 * 1000;

function generateTokens(userId: number, rolId: number) {
  const accessToken = jwt.sign(
    { id: userId, rol_id: rolId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );
  const refreshToken = jwt.sign(
    { id: userId, rol_id: rolId },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions
  );
  return { accessToken, refreshToken };
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_MAX_AGE,
  });
}

export const login = async (req: Request, res: Response): Promise<void> => {
  const { correo, password } = req.body;

  try {
    if (!correo || !password) {
      res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'Por favor, ingrese correo y contraseña' });
      return;
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, nombre, correo, password, rol_id FROM persona WHERE correo = ?',
      [correo]
    );

    if (rows.length === 0) {
      res.status(HttpStatus.UNAUTHORIZED).json({ mensaje: 'Credenciales inválidas' });
      return;
    }

    const usuario = rows[0];
    const constrasenaValida = await bcrypt.compare(password, usuario.password);

    if (!constrasenaValida) {
      res.status(HttpStatus.UNAUTHORIZED).json({ mensaje: 'Credenciales inválidas' });
      return;
    }

    const { accessToken, refreshToken } = generateTokens(usuario.id, usuario.rol_id);
    setRefreshCookie(res, refreshToken);

    res.status(HttpStatus.OK).json({
      mensaje: 'Autenticación exitosa',
      token: accessToken,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol_id: usuario.rol_id,
      },
    });
  } catch (error) {
    console.error('Error en el controlador de login:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error interno del servidor' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    res.status(HttpStatus.UNAUTHORIZED).json({ mensaje: 'No hay sesión activa' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { id: number; rol_id: number };

    const { accessToken, refreshToken } = generateTokens(decoded.id, decoded.rol_id);
    setRefreshCookie(res, refreshToken);

    res.status(HttpStatus.OK).json({ token: accessToken });
  } catch {
    res.status(HttpStatus.UNAUTHORIZED).json({ mensaje: 'Sesión expirada, inicia sesión nuevamente' });
  }
};

export const logout = (_req: Request, res: Response): void => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.status(HttpStatus.OK).json({ mensaje: 'Sesión cerrada correctamente' });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { nombre, correo, password, rol_id } = req.body;

  try {
    if (!nombre || !correo || !password || !rol_id) {
      res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'Faltan campos obligatorios' });
      return;
    }

    const [existingUsers] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM persona WHERE correo = ?',
      [correo]
    );

    if (existingUsers.length > 0) {
      res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'El correo ya está registrado' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [resultado] = await pool.execute<ResultSetHeader>(
      'INSERT INTO persona (nombre, correo, password, rol_id) VALUES (?, ?, ?, ?)',
      [nombre, correo, hashedPassword, rol_id]
    );

    if (isClerkEnabled()) {
      await crearUsuarioEnClerk(resultado.insertId, nombre, correo, hashedPassword);
    }

    res.status(HttpStatus.CREATED).json({ mensaje: 'Usuario registrado exitosamente' });
  } catch (error) {
    console.error('Error en el controlador de registro:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error interno del servidor' });
  }
};

// Durante la migración, los usuarios nuevos también se crean en Clerk con el
// mismo hash bcrypt, para que puedan entrar por cualquiera de los dos accesos.
// Si falla, el usuario queda solo con el acceso anterior y se vinculará por
// correo cuando exista en Clerk.
async function crearUsuarioEnClerk(personaId: number, nombre: string, correo: string, hashedPassword: string) {
  try {
    const clerkUser = await getClerkClient().users.createUser({
      emailAddress: [correo],
      firstName: nombre,
      externalId: String(personaId),
      passwordDigest: hashedPassword,
      passwordHasher: 'bcrypt',
    });
    await pool.execute(
      'UPDATE persona SET clerk_user_id = ? WHERE id = ?',
      [clerkUser.id, personaId]
    );
  } catch (error) {
    console.error('No se pudo crear el usuario en Clerk:', error);
  }
}

export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, nombre, correo, rol_id FROM persona WHERE id = ?',
      [req.user!.id]
    );

    if (rows.length === 0) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Usuario no encontrado' });
      return;
    }

    const usuario = rows[0];
    res.status(HttpStatus.OK).json({
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol_id: usuario.rol_id,
      },
    });
  } catch (error) {
    console.error('Error en el controlador de me:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error interno del servidor' });
  }
};
