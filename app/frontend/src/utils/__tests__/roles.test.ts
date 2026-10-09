import { rolTieneAcceso, ROLES } from '../roles';

describe('roles utils', () => {
  describe('rolTieneAcceso', () => {
    it('retorna false si no hay rol', () => {
      expect(rolTieneAcceso(undefined, [ROLES.ADMIN])).toBe(false);
      expect(rolTieneAcceso(null, [ROLES.ADMIN])).toBe(false);
    });

    it('retorna false si el rol no es numérico', () => {
      expect(rolTieneAcceso('no_es_numero', [ROLES.ADMIN])).toBe(false);
    });

    it('retorna true si es admin', () => {
      expect(rolTieneAcceso(ROLES.ADMIN, [ROLES.MINISTRO])).toBe(true);
    });

    it('retorna true si el usuario tiene el rol pedido exactamente', () => {
      expect(rolTieneAcceso(ROLES.COORDINADOR_MINISTROS, [ROLES.COORDINADOR_MINISTROS])).toBe(true);
    });

    it('retorna false si el rol jerarquico no incluye el pedido', () => {
      expect(rolTieneAcceso(ROLES.MINISTRO, [ROLES.ADMIN])).toBe(false);
    });

    it('retorna el rol por defecto si no existe en la jerarquia', () => {
      expect(rolTieneAcceso(999, [999])).toBe(true);
      expect(rolTieneAcceso(999, [ROLES.ADMIN])).toBe(false);
    });

    it('acepta el rol como texto numérico', () => {
      expect(rolTieneAcceso('5', [ROLES.MINISTRO])).toBe(true);
    });
  });
});
