import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ROLES, ROLE_HIERARCHY } from '../../utils/roles';

export { ROLES };

interface Props {
  children: ReactNode;
  allowedRoles: number[];
}


export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const token = localStorage.getItem('token');
  const usuarioGuardado = localStorage.getItem('usuario');

  if (!token || !usuarioGuardado) {
    return <Navigate to="/login" replace />;
  }

  let usuario: { rol_id?: number } | null = null;

  try {
    usuario = JSON.parse(usuarioGuardado);
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    return <Navigate to="/login" replace />;
  }

  const userRolId = Number(usuario?.rol_id);

  if (!userRolId) {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    return <Navigate to="/login" replace />;
  }

  const effectiveRoles = ROLE_HIERARCHY[userRolId] ?? [userRolId];
  const hasAccess = allowedRoles.some((role) => effectiveRoles.includes(role));

if (!hasAccess) {
  return <Navigate to="/dashboard" replace />;
}

  return <>{children}</>;
}