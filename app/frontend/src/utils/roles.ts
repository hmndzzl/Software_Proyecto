export const ROLES = {
  SACERDOTE: 1,
  COORDINADOR_MINISTROS: 2,
  COORDINADOR_GRUPOS: 3,
  MINISTRO: 4,
  ADMIN: 5,
} as const;

export const ROLE_HIERARCHY: Record<number, number[]> = {
  [ROLES.ADMIN]: [ROLES.ADMIN, ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.MINISTRO],
  [ROLES.SACERDOTE]: [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.MINISTRO],
  [ROLES.COORDINADOR_MINISTROS]: [ROLES.COORDINADOR_MINISTROS, ROLES.MINISTRO],
  [ROLES.COORDINADOR_GRUPOS]: [ROLES.COORDINADOR_GRUPOS],
  [ROLES.MINISTRO]: [ROLES.MINISTRO],
};

export function usuarioTieneRol(allowedRoles: number[]) {
  const usuarioGuardado = localStorage.getItem('usuario');

  if (!usuarioGuardado) return false;

  try {
    const usuario = JSON.parse(usuarioGuardado);
    const userRolId = Number(usuario?.rol_id);

    if (!userRolId) return false;

    const effectiveRoles = ROLE_HIERARCHY[userRolId] ?? [userRolId];

    return allowedRoles.some((role) => effectiveRoles.includes(role));
  } catch {
    return false;
  }
}