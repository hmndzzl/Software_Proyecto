# Pruebas de seguridad sobre el sistema desplegado

**Fecha:** 27 de octubre de 2026 (America/Guatemala)  
**Objetivo:** `https://parroquiasanpedronolasco.org.gt/`  
**Revisión local de referencia:** `56580eb` (`develop`)  
**Resultado general:** **Aprobado con un hallazgo de severidad media.** El límite de intentos funciona en producción y el API conserva las cabeceras de Helmet. El documento HTML servido por Nginx no recibe el mismo conjunto de cabeceras.

## Alcance y método

La revisión se limitó a comprobaciones no destructivas sobre el dominio autorizado:

- redirección de HTTP a HTTPS y certificado TLS;
- protocolos TLS admitidos;
- cabeceras HTTP del frontend y del API;
- política CORS con el origen oficial y un origen no confiable;
- once solicitudes vacías al endpoint de inicio de sesión, sin correos ni contraseñas reales, para comprobar el límite de 10 intentos por 15 minutos.

No se usaron OWASP ZAP, Metasploit ni John the Ripper. Esas herramientas aparecen como referencias opcionales en los anexos del curso y no eran necesarias para verificar los dos controles solicitados. No se hicieron pruebas de explotación, fuerza bruta con cuentas reales ni cambios de datos.

El JavaScript público desplegado define como base del API `https://parroquiasanpedronolasco.org.gt/api`. Debido al proxy inverso, el endpoint probado externamente fue `POST /api/api/auth/login`, que corresponde a `POST /api/auth/login` en Express.

## Resultados

| Control | Evidencia observada | Resultado |
| --- | --- | --- |
| Límite de intentos | Intentos 1–10: HTTP 400 y `RateLimit` descendiendo de `r=9` a `r=0`. Intento 11: HTTP 429, `Retry-After: 896` y mensaje de espera de 15 minutos. | **Aprobado** |
| Cabeceras del API | `/api/health` y el login devuelven CSP, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`, COOP y CORP. | **Aprobado** |
| Cabeceras del frontend | `/` y `/login` devuelven HSTS, pero no CSP, `X-Content-Type-Options`, `X-Frame-Options` ni `Referrer-Policy`. | **Hallazgo medio** |
| Redirección HTTPS | HTTP responde 301 hacia la misma URL con HTTPS. | **Aprobado** |
| TLS | TLS 1.0 y 1.1 rechazados; TLS 1.2 y 1.3 aceptados. | **Aprobado** |
| Certificado | Let's Encrypt, CN y SAN para el dominio y `www`; vigencia del 31 de agosto al 29 de noviembre de 2026. | **Aprobado** |
| CORS | El origen oficial recibe `Access-Control-Allow-Origin` y credenciales; `https://untrusted.example` no recibe permiso de origen. | **Aprobado** |

### Evidencia del límite de inicio de sesión

El despliegue coincide con `login-rate-limit.middleware.ts`, que configura 10 solicitudes por IP en 15 minutos:

```text
intento=1  estado=400  RateLimit: "10-in-15min"; r=9; t=900
...
intento=10 estado=400  RateLimit: "10-in-15min"; r=0; t=897
intento=11 estado=429  RateLimit: "10-in-15min"; r=0; t=896
Retry-After: 896
{"mensaje":"Demasiados intentos de inicio de sesión. Inténtalo de nuevo en 15 minutos."}
```

Las primeras respuestas 400 prueban que la solicitud llegó al controlador sin credenciales; el cambio a 429 en la undécima solicitud prueba que el middleware bloqueó la petición antes de continuar. Las respuestas de producción también exponen las cabeceras estándar del contador y del tiempo de reintento.

### Evidencia de cabeceras

Respuesta del API:

```text
Content-Security-Policy: default-src 'self'; ...; upgrade-insecure-requests
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

Respuesta del documento HTML:

```text
HTTP/1.1 200 OK
Server: nginx
Content-Type: text/html
Strict-Transport-Security: max-age=31536000
```

La configuración de Helmet se aplica dentro de Express. El frontend se entrega directamente desde Nginx y evita Express, por lo que solo hereda la cabecera HSTS configurada en el proxy externo.

## Hallazgo y recomendación

**SEC-DEP-01 — Cabeceras incompletas en las páginas HTML (severidad media).** La defensa contra MIME sniffing, framing y carga de recursos no está expresada en la respuesta que procesa el navegador para `/` y `/login`. Tener esas cabeceras solo en las respuestas JSON del API no protege el documento principal.

Se recomienda añadir en el bloque del sitio Nginx, o en el proxy TLS que esté delante de él, una política compatible con los recursos reales del frontend:

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Referrer-Policy "no-referrer" always;
add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com; form-action 'self'; upgrade-insecure-requests" always;
```

Antes de desplegar la CSP propuesta se deben confirmar los dominios exactos usados por Clerk en producción. Es preferible probarla primero como `Content-Security-Policy-Report-Only` y revisar las violaciones, porque una lista incompleta podría impedir el inicio de sesión. Después del ajuste, repetir `curl -I` sobre `/`, `/login` y un recurso inexistente para confirmar que `always` también cubre respuestas de error.

## Comandos de reproducción

```sh
curl -sS -D - -o /dev/null https://parroquiasanpedronolasco.org.gt/
curl -sS -D - -o /dev/null https://parroquiasanpedronolasco.org.gt/api/health
curl -sS -D - -o /dev/null -H 'Origin: https://parroquiasanpedronolasco.org.gt' https://parroquiasanpedronolasco.org.gt/api/health
curl -sS -D - -o /dev/null -H 'Origin: https://untrusted.example' https://parroquiasanpedronolasco.org.gt/api/health
```

Para no bloquear accidentalmente una IP compartida, la secuencia de once intentos debe ejecutarse solo desde un origen de prueba autorizado y sabiendo que esa IP quedará limitada durante aproximadamente 15 minutos:

```sh
for intento in {1..11}; do
  curl -sS -X POST \
    -H 'Content-Type: application/json' \
    --data '{}' \
    -D - \
    https://parroquiasanpedronolasco.org.gt/api/api/auth/login
done
```

## Conclusión

La protección contra intentos repetidos de inicio de sesión **sigue funcionando correctamente** en el sistema desplegado. Las cabeceras de seguridad **siguen funcionando en el API**, incluida la respuesta 429, pero su cobertura es parcial: el HTML público servido por Nginx carece de varias cabeceras esenciales. El hallazgo debe corregirse en la capa que sirve el frontend y verificarse nuevamente después del despliegue.
