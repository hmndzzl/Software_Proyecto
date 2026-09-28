import { usuarioTieneRol, ROLES } from '../roles';

describe('roles utils', () => {
  describe('usuarioTieneRol', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('retorna false si no hay usuario guardado', () => {
      expect(usuarioTieneRol([ROLES.ADMIN])).toBe(false);
    });

    it('retorna false si falla el parseo', () => {
      localStorage.setItem('usuario', 'no_es_json');
      expect(usuarioTieneRol([ROLES.ADMIN])).toBe(false);
    });

    it('retorna false si no hay rol_id', () => {
      localStorage.setItem('usuario', JSON.stringify({ nombre: 'Juan' }));
      expect(usuarioTieneRol([ROLES.ADMIN])).toBe(false);
    });

    it('retorna true si es admin', () => {
      localStorage.setItem('usuario', JSON.stringify({ rol_id: ROLES.ADMIN }));
      expect(usuarioTieneRol([ROLES.MINISTRO])).toBe(true);
    });
    
    it('retorna true si el usuario tiene el rol pedido exactamente', () => {
      localStorage.setItem('usuario', JSON.stringify({ rol_id: ROLES.COORDINADOR_MINISTROS }));
      expect(usuarioTieneRol([ROLES.COORDINADOR_MINISTROS])).toBe(true);
    });

    it('retorna false si el rol jerarquico no incluye el pedido', () => {
      localStorage.setItem('usuario', JSON.stringify({ rol_id: ROLES.MINISTRO }));
      expect(usuarioTieneRol([ROLES.ADMIN])).toBe(false);
    });

    it('retorna el rol por defecto si no existe en la jerarquia', () => {
      localStorage.setItem('usuario', JSON.stringify({ rol_id: 999 }));
      expect(usuarioTieneRol([999])).toBe(true);
      expect(usuarioTieneRol([ROLES.ADMIN])).toBe(false);
    });
  });
});
