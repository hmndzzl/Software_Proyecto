import apiClient from './client';

export type EstadoCuenta = 'pendiente' | 'activa' | 'rechazada';

export interface Cuenta {
  id: number;
  nombre: string;
  correo: string;
  rol_id: number;
  estado_cuenta: EstadoCuenta;
}

export interface NuevaCuenta {
  nombre: string;
  correo: string;
  password: string;
  rol_id: number;
}

/** Devuelve `advertencia` si la cuenta se creó pero no se pudo crear en Clerk. */
export async function crearCuentaApi(cuenta: NuevaCuenta): Promise<{ advertencia?: string }> {
  const { data } = await apiClient.post<{ advertencia?: string }>('/api/auth/register', cuenta);
  return data ?? {};
}

export async function listarCuentasApi(estado: EstadoCuenta): Promise<Cuenta[]> {
  const { data } = await apiClient.get<Cuenta[]>('/api/cuentas', { params: { estado } });
  return data;
}

export async function aprobarCuentaApi(id: number, rolId: number): Promise<void> {
  await apiClient.patch(`/api/cuentas/${id}/aprobar`, { rol_id: rolId });
}

export async function rechazarCuentaApi(id: number): Promise<void> {
  await apiClient.patch(`/api/cuentas/${id}/rechazar`);
}
