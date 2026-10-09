import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/roles';
import Spinner from './Spinner';

export { ROLES };

interface Props {
  children: ReactNode;
  allowedRoles: number[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { usuario, estado, tieneRol } = useAuth();

  if (estado === 'cargando') {
    return <Spinner fullPage label="Validando tu sesión…" />;
  }

  // Sin usuario, o con un usuario sin rol válido, no hay sesión utilizable.
  if (estado === 'anonimo' || !Number(usuario?.rol_id)) {
    return <Navigate to="/login" replace />;
  }

  if (!tieneRol(allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
