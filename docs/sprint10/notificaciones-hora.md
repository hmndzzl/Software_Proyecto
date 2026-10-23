# Hora de envío y búsqueda por rango

En `/notificaciones`, Recibidas, Enviadas y Papelera muestran fecha y hora de envío
en `America/Guatemala`. La campana usa el mismo formato. Los campos **Desde** y
**Hasta** filtran automáticamente la bandeja visible y pueden usarse por separado.
El minuto final completo está incluido. **Limpiar filtros** vuelve a mostrar todo.
Un inicio posterior al final muestra una advertencia y ningún resultado.

El filtro se realiza en frontend sobre las listas completas que ya devuelve la API;
no cambia contadores de no leídas, permisos ni las acciones de marcar todas/vaciar.
No se añaden parámetros de filtrado a la API. El rango se mantiene al cambiar de
bandeja y se aplica a los resultados actualizados por los hooks existentes.

## Persistencia y despliegue

La columna nueva `notificacion.enviado_en` es DATETIME en UTC con valor automático
`UTC_TIMESTAMP()`, por lo que registra tanto los envíos manuales como los avisos
automáticos sin depender de la zona horaria del proceso Node o de MariaDB.
Los clientes no pueden elegir este valor en el POST. La columna `fecha` se conserva
para compatibilidad y para los registros históricos.

En bases existentes, ejecutar **antes de desplegar el backend**:

```sql
SOURCE /ruta/20261023_notificacion_enviado_en.sql;
```

Archivo: `app/database/migrations/20261023_notificacion_enviado_en.sql`.
La migración es repetible: agrega la columna con NULL para filas existentes y
después establece el valor automático para nuevos envíos. No modifica fechas ni
borra datos. Las bases nuevas incluyen la columna en `01_schema.sql`; los ejemplos
históricos de `02_seeds.sql` conservan NULL.

Las notificaciones antiguas muestran **Hora no registrada**. Como no es posible
recuperar su hora real, quedan fuera de una búsqueda por rango; sin filtros siguen
visibles. La propia interfaz explica esta limitación.

## API y Postman

Autenticación: `Authorization: Bearer <token>`. Las tres consultas responden 200
con su arreglo habitual, añadiendo `enviado_en` en ISO UTC (ejemplo:
`2026-10-23T17:30:45Z`, equivalente a 11:30 de Guatemala), o NULL para históricos.

- `GET http://localhost:3001/api/notificaciones`: recibidas del usuario autenticado.
- `GET http://localhost:3001/api/notificaciones/enviadas`: envíos propios; solo
  Admin, Sacerdote o Coordinador de Ministros. Otros roles: 403.
- `GET http://localhost:3001/api/notificaciones/papelera`: papelera propia.
- Sin sesión: 401. La hora no amplía el acceso a notificaciones de otras personas.

`POST http://localhost:3001/api/notificaciones`, con Bearer y
`Content-Type: application/json`, conserva su contrato y permisos:

```json
{"mensaje":"Prueba de hora de envío","tipo":"individual","destinatarios":[9]}
```

Devuelve 201; consultar luego Recibidas del destinatario o Enviadas del remitente
para verificar `enviado_en`. Usar una cuenta y destinatario de pruebas.
Colección: `notificaciones-hora.postman.json` en este mismo directorio.

## Validación

`app/backend/tests/browser/notificaciones-hora-ui.test.ts` usa API, MariaDB temporal
y navegador reales. Verifica migración repetible, preservación histórica, captura
automática, aislamiento por usuario, 401/403, visualización con navegador en Tokio,
filtros en las tres bandejas, límite final inclusivo, rango inválido y limpieza.
Genera capturas de escritorio y móvil en `app/backend/test-results/` (ignoradas).

Desde backend, con Docker activo: `npm run test:agenda-ui -- notificaciones-hora-ui`.
En Windows con Edge: establecer `$env:PLAYWRIGHT_CHANNEL = 'msedge'`.
Las pruebas de frontend cubren la conversión de fecha y los límites del rango.
