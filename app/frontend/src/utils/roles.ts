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

/** Función pura: el estado del usuario sale de useAuth(), aquí no se lee la sesión. */
export function rolTieneAcceso(rolId: unknown, allowedRoles: number[]) {
  const userRolId = Number(rolId);

  if (!userRolId) return false;

  const effectiveRoles = ROLE_HIERARCHY[userRolId] ?? [userRolId];

  return allowedRoles.some((role) => effectiveRoles.includes(role));
}

export const ROLES_RESERVAS: number[] = [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.ADMIN];

export const RUTA_NUEVA_RESERVA = '/reservas?nueva=1';
