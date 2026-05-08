import { useState } from 'react';
import CrearGrupoForm from '../../modules/grupos/components/CrearGrupoForm';
import ListaGrupos from '../../modules/grupos/components/ListaGrupos';
import EditarGrupoForm from '../../modules/grupos/components/EditarGrupoForm';
import { Grupo } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead, CardBody } from '../../components/ui/Card';
import styles from './gruposPage.module.css';

const ROLES_CREAR_GRUPO = [1, 3, 5];

export default function GruposPage() {
  const [refreshKey, setRefreshKey]         = useState(0);
  const [grupoSeleccionado, setGrupoSelected] = useState<Grupo | null>(null);

  const usuario  = JSON.parse(localStorage.getItem('usuario') || '{}');
  const puedeCrear = ROLES_CREAR_GRUPO.includes(usuario?.rol_id);

  const handleChanged = () => {
    setRefreshKey(k => k + 1);
    setGrupoSelected(null);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Comunidades"
        title="Gestión de Grupos Parroquiales"
        subtitle="Organiza los grupos pastorales y comunidades de la parroquia."
      />

      {(puedeCrear || grupoSeleccionado) && (
        <div className={styles.formsGrid}>
          {puedeCrear && (
            <Card>
              <CardHead title="Crear Nuevo Grupo" />
              <CardBody>
                <CrearGrupoForm onGrupoCreado={handleChanged} />
              </CardBody>
            </Card>
          )}
          {grupoSeleccionado && (
            <Card>
              <CardHead title="Editar Grupo" />
              <CardBody>
                <EditarGrupoForm
                  grupo={grupoSeleccionado}
                  onGrupoActualizado={handleChanged}
                  onCancelar={() => setGrupoSelected(null)}
                />
              </CardBody>
            </Card>
          )}
        </div>
      )}

      <Card>
        <ListaGrupos refreshKey={refreshKey} onEditar={setGrupoSelected} />
      </Card>
    </div>
  );
}
