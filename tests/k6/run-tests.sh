#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
usage() {
  cat <<'HELP'
Uso: ./tests/k6/run-tests.sh [all|login|espacios|notificaciones|combined|reservas|calendario|colisiones|spike|soak|ID] [load|stress|both]
     ./tests/k6/run-tests.sh inspect
Sin argumentos: las 6 pruebas de carga. 'all both' ejecuta las 12 (incluye soak de 30 minutos).
Ejemplo aislado: K6_STACK=true ./tests/k6/run-tests.sh PC-AUTH-01
SMOKE=true: verificación breve, no certifica carga/estrés. Colisiones mantiene 30–40 VUs.
K6_RUNNER=docker (predeterminado) o native; K6_IMAGE=grafana/k6:2.2.0.
HELP
}
case "${1:-}" in -h|--help|help) usage; exit 0;; esac
TARGET="${1:-all}"
PROFILE="${2:-load}"
ACTION=run
[[ "$TARGET" != inspect ]] || { ACTION=inspect; TARGET=all; PROFILE=both; }
case "$PROFILE" in load|stress|both) ;; *) usage >&2; exit 2;; esac

# Pares explícitos para que IDs, perfiles y scripts nunca se mezclen.
LOAD=(PC-AUTH-01 PC-ESP-01 PC-NOTIF-01 PC-RES-01 PC-CAL-01 PC-E2E-01)
STRESS=(PE-AUTH-01 PE-ESP-01 PE-NOTIF-01 PE-RES-01 PE-SPIKE-01 PE-SOAK-01)
script_for() {
  case "$1" in
    PC-AUTH-01|PE-AUTH-01) echo 01_auth_login.js;;
    PC-ESP-01|PE-ESP-01) echo 02_espacios_disponibilidad.js;;
    PC-NOTIF-01|PE-NOTIF-01) echo 03_notificaciones_polling.js;;
    PC-E2E-01) echo 04_scenario_combined.js;;
    PC-RES-01) echo 05_reservas.js;;
    PC-CAL-01) echo 06_calendario.js;;
    PE-RES-01) echo 07_reservas_colisiones.js;;
    PE-SPIKE-01) echo 08_spike.js;;
    PE-SOAK-01) echo 09_soak.js;;
    *) return 1;;
  esac
}
IDS=()
case "$TARGET" in
  PC-*|PE-*) script_for "$TARGET" >/dev/null || { usage >&2; exit 2; }; IDS=("$TARGET");;
  all)
    [[ "$PROFILE" == stress ]] || IDS+=("${LOAD[@]}")
    [[ "$PROFILE" == load ]] || IDS+=("${STRESS[@]}");;
  login|espacios|notificaciones|notif|reservas)
    case "$TARGET" in login) PART=AUTH;; espacios) PART=ESP;; notif|notificaciones) PART=NOTIF;; reservas) PART=RES;; esac
    [[ "$PROFILE" == stress ]] || IDS+=("PC-$PART-01")
    [[ "$PROFILE" == load ]] || IDS+=("PE-$PART-01");;
  combined|flujo|calendario)
    [[ "$PROFILE" == load ]] || { echo 'Ese módulo solo tiene prueba de carga.' >&2; exit 2; }
    [[ "$TARGET" == calendario ]] && IDS=(PC-CAL-01) || IDS=(PC-E2E-01);;
  colisiones) IDS=(PE-RES-01);;
  spike) IDS=(PE-SPIKE-01);;
  soak) IDS=(PE-SOAK-01);;
  *) usage >&2; exit 2;;
esac

RUNNER="${K6_RUNNER:-docker}"
if [[ "${K6_STACK:-false}" == true ]]; then
  export K6_FIXTURES=true
  if [[ "$RUNNER" == native ]]; then
    BASE_URL="${BASE_URL:-http://localhost:3002}"
  else
    BASE_URL="${BASE_URL:-http://backend:3001}"
  fi
else
  if [[ "$RUNNER" == native ]]; then BASE_URL="${BASE_URL:-http://localhost:3001}"
  else BASE_URL="${BASE_URL:-http://host.docker.internal:3001}"; fi
fi
export BASE_URL
RESULTS="$DIR/results/$(date -u +%Y%m%dT%H%M%SZ)-$$"
mkdir -p "$RESULTS"
if [[ "$RUNNER" == docker ]]; then
  CMD=(docker run --rm --user "$(id -u):$(id -g)" -v "$DIR:/tests:ro" -v "$RESULTS:/results")
  if [[ "${K6_STACK:-false}" == true ]]; then CMD+=(--network parroquia-k6_default)
  else CMD+=(--add-host host.docker.internal:host-gateway); fi
  for name in BASE_URL K6_FIXTURES SMOKE USERS_JSON ADMIN_EMAIL ADMIN_PASSWORD RESERVA_SPACE_IDS TEST_DATE COLLISION_VUS SOAK_MINUTES; do
    [[ -z "${!name+x}" ]] || CMD+=(-e "$name")
  done
  CMD+=("${K6_IMAGE:-grafana/k6:2.2.0}")
  SCRIPT_DIR=/tests/scripts
  OUTPUT_DIR=/results
elif [[ "$RUNNER" == native ]]; then
  CMD=(k6)
  SCRIPT_DIR="$DIR/scripts"
  OUTPUT_DIR="$RESULTS"
else
  echo 'K6_RUNNER debe ser docker o native' >&2; exit 2
fi
failed=0
for id in "${IDS[@]}"; do
  [[ "$id" == PC-* ]] && mode=load || mode=stress
  script="$(script_for "$id")"
  echo "==> $id ($mode), destino $BASE_URL"
  args=("$ACTION" -e "PROFILE=$mode")
  if [[ "$ACTION" == run ]]; then
    args+=(--summary-export "$OUTPUT_DIR/$id-summary.json")
    [[ "${K6_TIMESERIES:-false}" != true ]] || args+=(--out "json=$OUTPUT_DIR/$id-timeseries.json.gz")
  fi
  if "${CMD[@]}" "${args[@]}" "$SCRIPT_DIR/$script" > >(tee "$RESULTS/$id.log") 2>&1; then
    echo "$id OK" | tee -a "$RESULTS/status.txt"
  else
    code=$?
    echo "$id FAIL (exit=$code)" | tee -a "$RESULTS/status.txt"
    failed=1
  fi
done
echo "Resultados: $RESULTS"
exit "$failed"
