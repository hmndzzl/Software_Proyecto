import { useState } from 'react';
import CrearGrupoForm from '../../modules/grupos/components/CrearGrupoForm';
import ListaGrupos from '../../modules/grupos/components/ListaGrupos';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead, CardBody } from '../../components/ui/Card';
import styles from './gruposPage.module.css';

const ROLES_CREAR_GRUPO = [1, 3, 5];

export default function GruposPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { usuario } = useAuth();
  const puedeCrear = usuario !== null && ROLES_CREAR_GRUPO.includes(usuario.rol_id);

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Comunidades"
        title="Gestión de Grupos Parroquiales"
        subtitle="Organiza los grupos pastorales y comunidades de la parroquia."
      />

      {puedeCrear && (
        <div className={styles.formsGrid}>
          <Card>
            <CardHead title="Crear Nuevo Grupo" />
            <CardBody>
              <CrearGrupoForm onGrupoCreado={() => setRefreshKey(k => k + 1)} />
            </CardBody>
          </Card>
        </div>
      )}

      <Card>
        <ListaGrupos refreshKey={refreshKey} />
      </Card>
    </div>
  );
}
