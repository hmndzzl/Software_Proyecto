# Aviso automático de nueva reserva

`develop` ya incluía un aviso básico al crear reservas. Esta tarea completa ese
flujo, sin agregar un segundo aviso: se notifica a **todos los Sacerdotes y Admin
con cuenta activa**, incluido el solicitante si tiene uno de esos roles, porque
su solicitud también queda pendiente de aprobación.

Se crea una notificación con una entrega individual no leída por aprobador.
El remitente es el solicitante. El mensaje identifica número de reserva, título,
fecha y horario, e indica revisar **Reservas** para aprobarla. Las cuentas inactivas
y los demás roles no reciben el aviso. Si no hay aprobadores activos, la reserva
se guarda pendiente sin una notificación sin destinatarios.

La reserva, su evento y todas las entregas se confirman en una sola transacción.
Solo entonces se devuelve 201. Un fallo de escritura o confirmación devuelve 500 y
revierte las escrituras; una solicitud rechazada por validación o autorización no
crea avisos. El envío ocurre durante la creación, sin un proceso periódico.

La campana utiliza la actualización automática existente (60 segundos por defecto,
configurable en la interfaz). El aviso está disponible en la API inmediatamente
después del 201; no se promete una entrega push instantánea al navegador.

## API y prueba manual

No hay cambios de contrato ni migraciones nuevas.

1. Iniciar sesión como Coordinador de Grupos/Ministros, Sacerdote o Admin.
2. Enviar `POST http://localhost:3001/api/reservas`, con
   `Authorization: Bearer <token>` y `Content-Type: application/json`:

```json
{"fecha":"2099-11-20","hora_inicio":"14:00","hora_fin":"15:00","espacio_id":2,"titulo":"Reunión parroquial","descripcion":"Planificación mensual"}
```

3. Esperar 201 con `message` y `reservaId`.
4. Con sesión de Sacerdote/Admin activo, consultar
   `GET http://localhost:3001/api/notificaciones`. Devuelve 200 y el aviso con
   `leida: 0`, `remitente_id` del solicitante y la hora en `enviado_en`.
5. En la web, abrir la campana o Notificaciones; luego ir a Reservas para aprobar.

Sin sesión: 401. Un Ministro no puede crear reservas: 403. Campos obligatorios
omitidos: 400. Conflicto con una reserva confirmada: 409. Otros usuarios no ven
el aviso en su bandeja. Usar cuentas y datos de pruebas.

La colección `nueva-reserva-notificacion.postman.json` separa el token del
solicitante y el del aprobador para comprobar ambos lados del flujo.

## Validación

Desde backend:

```sh
npm test -- --maxWorkers=2
npm run build
npm run test:integration -- reserva-notificacion.integration
```

La integración con MariaDB temporal comprueba receptores activos, exclusión de
otros roles, entrega al propio aprobador, ausencia de duplicados por receptor,
consulta autenticada, rechazos 400/401/403 y rollback de reserva/evento/avisos ante
un fallo de entrega. La prueba unitaria verifica que un commit fallido nunca
produzca una respuesta 201.
