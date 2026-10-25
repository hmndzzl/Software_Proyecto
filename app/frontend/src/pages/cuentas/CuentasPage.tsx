import { useCallback, useEffect, useState } from 'react';
import {
  aprobarCuentaApi,
  listarCuentasApi,
  rechazarCuentaApi,
  type Cuenta,
  type EstadoCuenta,
} from '../../api/cuentas';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead } from '../../components/ui/Card';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import Btn from '../../components/ui/Btn';
import SortableTh from '../../components/ui/SortableTh';
import TableFilters from '../../components/ui/TableFilters';
import { useSortableTable } from '../../hooks/useSortableTable';
import { useTableFilters } from '../../hooks/useTableFilters';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import { SelectUI } from '../../components/ui/Field';
import NuevaCuentaModal from './NuevaCuentaModal';
import DetalleConDecisiones from '../../components/ui/DetalleConDecisiones';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/roles';
import { getApiErrorMessage } from '../../utils/apiError';
import styles from './CuentasPage.module.css';

const ROL_OPCIONES: { id: number; label: string }[] = [
  { id: ROLES.MINISTRO, label: 'Ministro' },
  { id: ROLES.COORDINADOR_MINISTROS, label: 'Coord. de Ministros' },
  { id: ROLES.COORDINADOR_GRUPOS, label: 'Coord. de Grupos' },
  { id: ROLES.SACERDOTE, label: 'Sacerdote' },
  { id: ROLES.ADMIN, label: 'Administrador' },
];

const PESTANAS: { estado: EstadoCuenta; label: string; titulo: string; vacio: string }[] = [
  { estado: 'pendiente', label: 'Pendientes', titulo: 'Cuentas pendientes', vacio: 'No hay cuentas pendientes de aprobación.' },
  { estado: 'activa', label: 'Activas', titulo: 'Cuentas activas', vacio: 'No hay cuentas activas.' },
  { estado: 'rechazada', label: 'Rechazadas', titulo: 'Cuentas rechazadas', vacio: 'No hay cuentas rechazadas.' },
];

const rolLabel = (rolId: number) => ROL_OPCIONES.find((r) => r.id === rolId)?.label ?? 'Sin rol';

function getInitials(nombre: string): string {
  return nombre.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

export default function CuentasPage() {
  const { usuario } = useAuth();
  const [estado, setEstado] = useState<EstadoCuenta>('pendiente');
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const toast = useToast();
  const [actuandoId, setActuandoId] = useState<number | null>(null);
  const [rolPorCuenta, setRolPorCuenta] = useState<Record<number, number>>({});
  const [porRechazar, setPorRechazar] = useState<Cuenta | null>(null);
  const [creando, setCreando] = useState(false);
  const [detalle, setDetalle] = useState<Cuenta | null>(null);
  const rolVisible = (cuenta: Cuenta) => rolLabel(estado === 'activa' ? cuenta.rol_id : rolPorCuenta[cuenta.id] ?? ROLES.MINISTRO);
  const filtros = useTableFilters(cuentas, {
    search: c => [c.nombre, c.correo, rolVisible(c)],
    selects: [{ key: 'rol', label: estado === 'activa' ? 'Rol' : 'Rol a asignar', value: rolVisible }],
  });
  const orden = useSortableTable(filtros.filteredData, {
    nombre: (c: Cuenta) => c.nombre.toLowerCase(),
    correo: (c: Cuenta) => c.correo.toLowerCase(),
    rol: rolVisible,
  });

  // Solo un Admin puede otorgar el rol de Administrador; el backend también lo valida.
  const rolesDisponibles = ROL_OPCIONES.filter(
    (rol) => rol.id !== ROLES.ADMIN || usuario?.rol_id === ROLES.ADMIN
  );

  const cargar = useCallback(() => {
    setLoading(true);
    setError('');
    listarCuentasApi(estado)
      .then(setCuentas)
      .catch(() => setError('Error al obtener las cuentas'))
      .finally(() => setLoading(false));
  }, [estado]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarPestana = (nuevo: EstadoCuenta) => {
    filtros.controls.clear();
    setEstado(nuevo);
  };

  const pestana = PESTANAS.find((p) => p.estado === estado)!;
  // Por defecto se propone el rol que la cuenta ya trae (el asignado al crearla), si quien aprueba puede otorgarlo.
  const rolElegido = (cuenta: Cuenta) =>
    rolPorCuenta[cuenta.id] ?? (rolesDisponibles.some((r) => r.id === cuenta.rol_id) ? cuenta.rol_id : ROLES.MINISTRO);

  // El selector de rol solo tiene sentido al aprobar; en Activas se muestra el rol actual.
  const asignaRol = estado !== 'activa';

  // No se puede rechazar la propia cuenta, ni un Sacerdote la de un Admin (el backend también lo valida).
  const puedeRechazar = (c: Cuenta) =>
    c.id !== usuario?.id && (c.rol_id !== ROLES.ADMIN || usuario?.rol_id === ROLES.ADMIN);

  const quitarDeLista = (id: number) => setCuentas((prev) => prev.filter((c) => c.id !== id));

  const aprobar = async (cuenta: Cuenta) => {
    const rolId = rolElegido(cuenta);
    const rol = ROL_OPCIONES.find((r) => r.id === rolId)?.label;
    setActuandoId(cuenta.id);
    try {
      await aprobarCuentaApi(cuenta.id, rolId);
      quitarDeLista(cuenta.id);
      toast.success('Cuenta aprobada', `${cuenta.nombre} ya puede iniciar sesión como ${rol}.`);
    } catch (err: unknown) {
      toast.error('No se pudo aprobar la cuenta', getApiErrorMessage(err, 'Intenta de nuevo en unos momentos.'));
    } finally {
      setActuandoId(null);
    }
  };

  const confirmarRechazo = async () => {
    if (!porRechazar) return;
    const cuenta = porRechazar;
    setActuandoId(cuenta.id);
    try {
      await rechazarCuentaApi(cuenta.id);
      quitarDeLista(cuenta.id);
      toast.success(
        'Cuenta rechazada',
        `${cuenta.nombre} ${cuenta.estado_cuenta === 'activa' ? 'ya no tiene acceso al sistema' : 'no podrá entrar al sistema'}. Puedes volver a aprobarla desde la pestaña Rechazadas.`
      );
    } catch (err: unknown) {
      toast.error('No se pudo rechazar la cuenta', getApiErrorMessage(err, 'Intenta de nuevo en unos momentos.'));
    } finally {
      setActuandoId(null);
      setPorRechazar(null);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Administración"
        title="Aprobación de cuentas"
        subtitle="Crea cuentas nuevas y revisa las pendientes asignando el rol con el que podrán entrar al sistema."
        actions={<Btn onClick={() => setCreando(true)}>Nueva cuenta</Btn>}
      />

      <Card>
        <CardHead
          title={pestana.titulo}
          hint={!loading && !error ? `${cuentas.length} cuentas` : undefined}
        />

        <div className={styles.tabs} role="tablist">
          {PESTANAS.map((p) => (
            <button
              key={p.estado}
              type="button"
              role="tab"
              aria-selected={estado === p.estado}
              className={`${styles.tab}${estado === p.estado ? ` ${styles.tabActiva}` : ''}`}
              onClick={() => cambiarPestana(p.estado)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading && <LoadingState label="Cargando cuentas..." />}
        {!loading && !error && <TableFilters {...filtros.controls} label="Filtros de cuentas" />}
        {error && <ErrorState message={error} onRetry={cargar} />}

        {!loading && !error && cuentas.length === 0 && (
          <EmptyState message={pestana.vacio} />
        )}

        {!loading && !error && cuentas.length > 0 && (
          <div className="table-container">
            <table className="styled-table">
              <thead>
                <tr>
                  <SortableTh label="Nombre" sortKey="nombre" activeKey={orden.sortKey} dir={orden.sortDir} onSort={orden.toggleSort} />
                  <SortableTh label="Correo" sortKey="correo" activeKey={orden.sortKey} dir={orden.sortDir} onSort={orden.toggleSort} />
                  <SortableTh label={asignaRol ? 'Rol a asignar' : 'Rol'} sortKey="rol" activeKey={orden.sortKey} dir={orden.sortDir} onSort={orden.toggleSort} />
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orden.sortedData.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className={styles.nameCell}>
                        <div className={styles.avatar}>{getInitials(c.nombre)}</div>
                        <span className={styles.nombre}>{c.nombre}</span>
                      </div>
                    </td>
                    <td className={styles.correo}>{c.correo}</td>
                    {!asignaRol && <td><span className={styles.rolBadge}>{rolLabel(c.rol_id)}</span></td>}
                    {asignaRol && <td>
                      <SelectUI
                        aria-label={`Rol para ${c.nombre}`}
                        value={rolElegido(c)}
                        disabled={actuandoId === c.id}
                        onChange={(e) => setRolPorCuenta((prev) => ({ ...prev, [c.id]: Number(e.target.value) }))}
                      >
                        {rolesDisponibles.map((rol) => (
                          <option key={rol.id} value={rol.id}>{rol.label}</option>
                        ))}
                      </SelectUI>
                    </td>}
                    <td>
                      <div className={styles.acciones}>
                        <Btn kind="ghost" size="sm" onClick={() => setDetalle(c)}>Ver detalle</Btn>
                        {estado !== 'activa' && (
                          <Btn kind="ok" size="sm" disabled={actuandoId === c.id} onClick={() => aprobar(c)}>
                            Aprobar
                          </Btn>
                        )}
                        {estado !== 'rechazada' && puedeRechazar(c) && (
                          <Btn kind="bad" size="sm" disabled={actuandoId === c.id} onClick={() => setPorRechazar(c)}>
                            Rechazar
                          </Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {detalle && <DetalleConDecisiones titulo={`Detalle de cuenta: ${detalle.nombre}`} endpoint={`/api/cuentas/${detalle.id}/decisiones`}
        onClose={() => setDetalle(null)} campos={[
          { etiqueta: 'Nombre', valor: detalle.nombre }, { etiqueta: 'Correo', valor: detalle.correo },
          { etiqueta: 'Rol actual', valor: rolLabel(detalle.rol_id) }, { etiqueta: 'Estado actual', valor: detalle.estado_cuenta },
        ]} />}
      <NuevaCuentaModal
        open={creando}
        roles={rolesDisponibles}
        onClose={() => setCreando(false)}
        onCreada={(nombre, rolId, advertencia) => {
          filtros.controls.clear();
          if (advertencia) toast.warning('Cuenta creada con una advertencia', `${nombre} quedó registrado como ${rolLabel(rolId)}. ${advertencia}`);
          else toast.success('Cuenta creada', `${nombre} quedó pendiente de aprobación. Al aprobarla como ${rolLabel(rolId)} se le avisará por correo.`);
          // Las cuentas nuevas quedan pendientes: se muestra esa pestaña para que se vea la recién creada.
          if (estado === 'pendiente') cargar();
          else setEstado('pendiente');
        }}
      />

      <Modal open={porRechazar !== null} title="Rechazar cuenta" onClose={() => setPorRechazar(null)}>
        <p className={styles.confirmTexto}>
          ¿Rechazar la cuenta de <strong>{porRechazar?.nombre}</strong> ({porRechazar?.correo})?{' '}
          {porRechazar?.estado_cuenta === 'activa'
            ? 'Dejará de poder iniciar sesión y se le avisará por correo.'
            : 'No podrá entrar al sistema y se le avisará por correo.'}{' '}
          Podrás aprobarla de nuevo más adelante desde la pestaña Rechazadas.
        </p>
        <div className={styles.confirmAcciones}>
          <Btn kind="ghost" onClick={() => setPorRechazar(null)}>Cancelar</Btn>
          <Btn kind="bad" onClick={confirmarRechazo}>Rechazar cuenta</Btn>
        </div>
      </Modal>
    </div>
  );
}
