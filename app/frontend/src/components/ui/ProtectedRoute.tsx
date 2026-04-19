import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

export const ROLES = {
  SACERDOTE: 1,
  COORDINADOR_MINISTROS: 2,
  COORDINADOR_GRUPOS: 3,
  MINISTRO: 4,
  ADMIN: 5,
} as const;

const ROLE_HIERARCHY: Record<number, number[]> = {
  [ROLES.ADMIN]: [ROLES.ADMIN, ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.MINISTRO],
  [ROLES.SACERDOTE]: [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.MINISTRO],
  [ROLES.COORDINADOR_MINISTROS]: [ROLES.COORDINADOR_MINISTROS, ROLES.MINISTRO],
  [ROLES.COORDINADOR_GRUPOS]: [ROLES.COORDINADOR_GRUPOS],
  [ROLES.MINISTRO]: [ROLES.MINISTRO],
};

interface Props {
  children: ReactNode;
  allowedRoles: number[];
}

function getHomeByRole(rolId: number): string {
  switch (rolId) {
    case ROLES.ADMIN:
    case ROLES.SACERDOTE:
      return '/ministros';

    case ROLES.COORDINADOR_MINISTROS:
      return '/tareas';

    case ROLES.COORDINADOR_GRUPOS:
      return '/reservas';

    case ROLES.MINISTRO:
      return '/tareas';

    default:
      return '/login';
  }
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
    return <Navigate to={getHomeByRole(userRolId)} replace />;
  }

  return <>{children}</>;
}