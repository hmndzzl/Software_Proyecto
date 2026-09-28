export interface ContactoCreateInput {
  nombre: string;
  correo: string;
  telefono?: string;
  motivo: string;
  mensaje: string;
}

export interface ContactoCreado extends ContactoCreateInput {
  id: number;
  fecha: string;
  notificacion_id: number;
}
