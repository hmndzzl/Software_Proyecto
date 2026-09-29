#!/bin/bash
set -e

echo "====================================================="
echo "   Ejecución de Pruebas de Volumen e Inundación"
echo "====================================================="

SCALE=${1:-small}
echo "Escala seleccionada: $SCALE"

case $SCALE in
    small)
        RESERVA_COUNT=1000
        PERSONA_NOTIF_COUNT=10000
        ;;
    medium)
        RESERVA_COUNT=10000
        PERSONA_NOTIF_COUNT=100000
        ;;
    large)
        RESERVA_COUNT=100000
        PERSONA_NOTIF_COUNT=1000000
        ;;
    *)
        echo "Escala no válida. Usando small, medium o large."
        exit 1
        ;;
esac

cd tests/db-volume

echo "Levantando el entorno (si no está activo)..."
docker-compose up -d db sysbench
echo "Esperando a que la BDD esté lista..."
sleep 10

echo "-----------------------------------------------------"
echo " Fase 1: Preparación (Generación Sintética) - $SCALE"
echo "-----------------------------------------------------"
docker-compose exec sysbench sysbench \
    --db-driver=mysql --mysql-host=db --mysql-port=3306 \
    --mysql-user=root --mysql-password=root --mysql-db=parroquia \
    --events=$RESERVA_COUNT --threads=10 \
    /sysbench/lua/prepare_reservas.lua run

docker-compose exec sysbench sysbench \
    --db-driver=mysql --mysql-host=db --mysql-port=3306 \
    --mysql-user=root --mysql-password=root --mysql-db=parroquia \
    --events=$PERSONA_NOTIF_COUNT --threads=10 \
    /sysbench/lua/prepare_notificaciones.lua run

echo "-----------------------------------------------------"
echo " Fase 2: Consultas de Volumen (PV) - $SCALE"
echo "-----------------------------------------------------"
docker-compose exec sysbench sysbench \
    --db-driver=mysql --mysql-host=db --mysql-port=3306 \
    --mysql-user=root --mysql-password=root --mysql-db=parroquia \
    --time=30 --threads=20 \
    /sysbench/lua/volume.lua run > reports/volume_${SCALE}.txt

echo "-----------------------------------------------------"
echo " Fase 3: Inundación Masiva (PI) - $SCALE"
echo "-----------------------------------------------------"
docker-compose exec sysbench sysbench \
    --db-driver=mysql --mysql-host=db --mysql-port=3306 \
    --mysql-user=root --mysql-password=root --mysql-db=parroquia \
    --time=30 --threads=20 \
    /sysbench/lua/flood.lua run > reports/flood_${SCALE}.txt

echo "Pruebas finalizadas. Resultados guardados en tests/db-volume/reports/"
