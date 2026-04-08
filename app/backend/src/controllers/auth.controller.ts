import { Request, Response } from 'express';
import pool from '../config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2';
import { HttpStatus } from '../utils/httpStatus';

// controlador login
export const login = async (req: Request, res: Response): Promise<void> => {
  // Extraemos los datos que envía el frontend
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

    // no existe ninguna persona con ese correo
    if (rows.length === 0) {
      res.status(HttpStatus.UNAUTHORIZED).json({ mensaje: 'Credenciales inválidas' });
      return;
    }

    const usuario = rows[0];

    // A futuro: cuando registremos usuarios, deberemos usar bcrypt.hash() para encriptarlas
    const constrasenaValida = await bcrypt.compare(password, usuario.password);

    if (!constrasenaValida) {
      res.status(HttpStatus.UNAUTHORIZED).json({ mensaje: 'Credenciales inválidas' });
      return;
    }

    // Token de inicio de sesion. JWT esta en env
    const jwtSecret = process.env.JWT_SECRET || 'llave_secreta_super_segura';

    // Al token le incluimos un payload
    const token = jwt.sign(
      {
        id: usuario.id,
        rol_id: usuario.rol_id
      },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' } // Duración del token
    );

    // Retornamos el token y los datos del usuario logueado al Frontend
    res.status(HttpStatus.OK).json({
      mensaje: 'Autenticación exitosa',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol_id: usuario.rol_id
      }
    });

  } catch (error) {
    console.error('Error en el controlador de login:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error interno del servidor' });
  }
};

// controlador registro
export const register = async (req: Request, res: Response): Promise<void> => {
  const { nombre, correo, password, rol_id } = req.body;

  try {
    if (!nombre || !correo || !password || !rol_id) {
      res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'Faltan campos obligatorios' });
      return;
    }

    // Verificar si el correo ya existe en la base de datos
    const [existingUsers] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM persona WHERE correo = ?',
      [correo]
    );

    if (existingUsers.length > 0) {
      res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'El correo ya está registrado' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Guardar en la base de datos con la contraseña ya encriptada
    const [result] = await pool.execute(
      'INSERT INTO persona (nombre, correo, password, rol_id) VALUES (?, ?, ?, ?)',
      [nombre, correo, hashedPassword, rol_id]
    );

    res.status(HttpStatus.CREATED).json({
      mensaje: 'Usuario registrado exitosamente',
    });

  } catch (error) {
    console.error('Error en el controlador de registro:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error interno del servidor' });
  }
};
