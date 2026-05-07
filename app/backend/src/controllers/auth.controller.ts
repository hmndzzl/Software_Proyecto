import { Request, Response } from 'express';
import pool from '../config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2';
import { HttpStatus } from '../utils/httpStatus';

const REFRESH_MAX_AGE = 15 * 24 * 60 * 60 * 1000;

function generateTokens(userId: number, rolId: number) {
  const accessToken = jwt.sign(
    { id: userId, rol_id: rolId },
    process.env.JWT_SECRET || 'llave_secreta_super_segura',
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' } as jwt.SignOptions
  );
  const refreshToken = jwt.sign(
    { id: userId, rol_id: rolId },
    process.env.JWT_REFRESH_SECRET || 'refresh_llave_secreta',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '15d' } as jwt.SignOptions
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
    const secret = process.env.JWT_REFRESH_SECRET || 'refresh_llave_secreta';
    const decoded = jwt.verify(token, secret) as { id: number; rol_id: number };

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

    await pool.execute(
      'INSERT INTO persona (nombre, correo, password, rol_id) VALUES (?, ?, ?, ?)',
      [nombre, correo, hashedPassword, rol_id]
    );

    res.status(HttpStatus.CREATED).json({ mensaje: 'Usuario registrado exitosamente' });
  } catch (error) {
    console.error('Error en el controlador de registro:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error interno del servidor' });
  }
};
