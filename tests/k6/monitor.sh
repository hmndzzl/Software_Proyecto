#!/usr/bin/env bash
# Ejecutar en paralelo a k6; Ctrl-C termina el muestreo sin tocar contenedores.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT="${1:-$DIR/results/infra-$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$OUTPUT"
COMPOSE=(docker compose -f "$DIR/docker-compose.yml")
ids=( $("${COMPOSE[@]}" ps -q backend mariadb) )
[[ "${#ids[@]}" == 2 ]] || { echo 'Inicia primero el stack tests/k6/docker-compose.yml' >&2; exit 1; }
echo "Muestreo cada 5 s en $OUTPUT; Ctrl-C para terminar."
samples="${MONITOR_SAMPLES:-0}"
[[ "$samples" =~ ^[0-9]+$ ]] || { echo 'MONITOR_SAMPLES debe ser un entero >= 0' >&2; exit 2; }
taken=0
while true; do
  timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  docker stats --no-stream --format "{\"timestamp\":\"$timestamp\",\"stats\":{{json .}}}" "${ids[@]}" >> "$OUTPUT/containers.jsonl"
  docker inspect --format "{\"timestamp\":\"$timestamp\",\"name\":{{json .Name}},\"restarts\":{{.RestartCount}},\"state\":{{json .State}}}" "${ids[@]}" >> "$OUTPUT/state.jsonl"
  printf '%s\n' "$timestamp" >> "$OUTPUT/mariadb.txt"
  "${COMPOSE[@]}" exec -T mariadb sh -c 'MYSQL_PWD="$MARIADB_PASSWORD" mariadb -u"$MARIADB_USER" "$MARIADB_DATABASE" -N -e "SHOW GLOBAL STATUS WHERE Variable_name IN (\"Threads_connected\",\"Threads_running\",\"Max_used_connections\",\"Aborted_connects\",\"Connection_errors_max_connections\",\"Innodb_deadlocks\",\"Innodb_row_lock_current_waits\",\"Innodb_row_lock_waits\");"' >> "$OUTPUT/mariadb.txt"
  taken=$((taken + 1))
  [[ "$samples" == 0 || "$taken" -lt "$samples" ]] || break
  sleep 5
done
