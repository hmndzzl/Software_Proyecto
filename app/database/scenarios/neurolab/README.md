# Escenario NeuroLab UVG

Estos scripts preparan y restablecen los datos de la evaluación de usabilidad sin borrar el volumen de MariaDB ni alterar las cuentas administrativas, la cuenta del sacerdote u otros datos ajenos al escenario.

## Precondiciones

Las siguientes cuentas deben haberse creado desde la plataforma y estar activas:

| Nombre | Correo | Rol |
| --- | --- | --- |
| Lucía Torres | `lucia.torres@example.com` | Coordinador de Ministros |
| Francisco Gutiérrez | `francisco.gutierrez@example.com` | Ministro |
| Raúl López | `raul.lopez@example.com` | Ministro |

Lucía y Francisco usan la contraseña de prueba `password123`. El script no modifica contraseñas ni vínculos con Clerk.

## Fecha de la sesión

Por defecto los scripts toman como fecha de prueba el día de ejecución en Guatemala y programan las actividades para el día siguiente. Deben ejecutarse el mismo día de la sesión.

Si se preparan con anticipación, sustituir esta línea al inicio de ambos archivos:

```sql
SET @neurolab_fecha_prueba = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-06:00'));
```

por la fecha real de la sesión:

```sql
SET @neurolab_fecha_prueba = DATE('2026-10-20');
```

## Aplicación en producción

Hacer primero un respaldo verificable de la base de datos. Después del despliegue del commit que contiene estos archivos, ejecutar por SSH desde `~/Software_Proyecto/app`:

```bash
docker compose -f docker-compose.prod.yml exec -T mariadb \
  sh -lc 'mariadb -u"$MARIADB_USER" -p"$MARIADB_PASSWORD" "$MARIADB_DATABASE"' \
  < database/scenarios/neurolab/prepare.sql
```

`prepare.sql` puede repetirse. Valida las cuentas y el salón antes de modificar datos, conserva administradores y sacerdote, vincula cinco ministros con Lucía, crea cuatro tareas de ambientación y deja catequesis sin responsable. No crea la limpieza, la reserva ni el cambio de turno que debe producir el participante. Los tres ministros auxiliares tienen una contraseña aleatoria no disponible y no pueden usarse para iniciar sesión; solo ambientan los selectores y tareas.

## Restablecimiento entre participantes

Cerrar la sesión de Francisco en el navegador y ejecutar:

```bash
docker compose -f docker-compose.prod.yml exec -T mariadb \
  sh -lc 'mariadb -u"$MARIADB_USER" -p"$MARIADB_PASSWORD" "$MARIADB_DATABASE"' \
  < database/scenarios/neurolab/reset.sql
```

El resumen final debe mostrar cero asignaciones para Francisco y Raúl, cero tareas de limpieza, cero cambios de turno y cero reservas del recorrido. La fila de catequesis debe mostrar `responsables = 0` y la fecha del día siguiente.

Después del restablecimiento, iniciar sesión como Lucía antes de entregar el equipo al siguiente participante.

## Credenciales del recorrido

- Lucía Torres: `lucia.torres@example.com` / `password123`
- Francisco Gutiérrez: `francisco.gutierrez@example.com` / `password123`

Raúl López no inicia sesión durante el estudio.
