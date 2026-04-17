export const ROLES = {
  SACERDOTE:              1,
  COORDINADOR_MINISTROS:  2,
  COORDINADOR_GRUPOS:     3,
  MINISTRO:               4,
  ADMIN:                  5,
} as const;

export type RoleId = typeof ROLES[keyof typeof ROLES];

/**
 * Herencia de roles (qué roles puede "actuar" cada rol).
 * Admin y Sacerdote tienen acceso total; la herencia refleja el UML de casos de uso.
 */
export const ROLE_HIERARCHY: Record<number, number[]> = {
  [ROLES.ADMIN]:                 [ROLES.ADMIN, ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.MINISTRO],
  [ROLES.SACERDOTE]:             [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.MINISTRO],
  [ROLES.COORDINADOR_MINISTROS]: [ROLES.COORDINADOR_MINISTROS, ROLES.MINISTRO],
  [ROLES.COORDINADOR_GRUPOS]:    [ROLES.COORDINADOR_GRUPOS],
  [ROLES.MINISTRO]:              [ROLES.MINISTRO],
};