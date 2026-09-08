#!/bin/bash
# ==============================================================================
# Runner automatizado para Pruebas de Carga y Estrés con Grafana k6
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$DIR/../.." && pwd)"
RESULTS_DIR="$DIR/results"
mkdir -p "$RESULTS_DIR"

BASE_URL="${BASE_URL:-http://host.docker.internal:3001}"

# Detección de binario k6 (nativo o docker)
if command -v k6 &> /dev/null; then
  K6_CMD="k6"
  # Si es nativo, localhost funciona directamente
  if [[ "$BASE_URL" == *"host.docker.internal"* ]]; then
    BASE_URL="http://localhost:3001"
  fi
  echo "==> Usando k6 nativo instalado en el sistema ($BASE_URL)"
else
  K6_CMD="docker run --rm -i -v $ROOT_DIR:$ROOT_DIR -w $ROOT_DIR -e BASE_URL=$BASE_URL grafana/k6"
  echo "==> Usando k6 a través de contenedor Docker (grafana/k6) hacia $BASE_URL"
fi

run_script() {
  local script_name="$1"
  local file_path="$DIR/scripts/$script_name"
  local output_json="$RESULTS_DIR/${script_name%.js}_result.json"

  echo ""
  echo "========================================================================"
  echo "🚀 Ejecutando prueba: $script_name"
  echo "========================================================================"

  $K6_CMD run \
    -e BASE_URL="$BASE_URL" \
    --summary-export="$output_json" \
    "$file_path"
    
  echo "✅ Prueba finalizada. Resumen guardado en: $output_json"
}

case "${1:-all}" in
  login)
    run_script "01_auth_login.js"
    ;;
  espacios)
    run_script "02_espacios_disponibilidad.js"
    ;;
  notificaciones|notif)
    run_script "03_notificaciones_polling.js"
    ;;
  combined|flujo)
    run_script "04_scenario_combined.js"
    ;;
  all)
    echo "Iniciando ejecución completa de las 4 suites de carga y estrés..."
    run_script "01_auth_login.js"
    run_script "02_espacios_disponibilidad.js"
    run_script "03_notificaciones_polling.js"
    run_script "04_scenario_combined.js"
    echo ""
    echo "🎉 Todas las pruebas de carga y estrés se completaron con éxito."
    ;;
  *)
    echo "Uso: $0 [login | espacios | notificaciones | combined | all]"
    exit 1
    ;;
esac
