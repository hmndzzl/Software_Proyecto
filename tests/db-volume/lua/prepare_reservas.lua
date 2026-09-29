function thread_init()
    drv = sysbench.sql.driver()
    con = drv:connect()
    con:query("SET FOREIGN_KEY_CHECKS=0")
end

function thread_done()
    con:disconnect()
end

function event()
    local espacio_id = sysbench.rand.default(1, 5)
    local estado_reserva_id = sysbench.rand.default(1, 4)
    local solicitante_id = sysbench.rand.default(1, 50)
    -- Fechas aleatorias en 2026
    local mes = sysbench.rand.default(1, 12)
    local dia = sysbench.rand.default(1, 28)
    local fecha = string.format("2026-%02d-%02d", mes, dia)
    local hora_inicio = string.format("%02d:00:00", sysbench.rand.default(8, 20))
    local hora_fin = string.format("%02d:00:00", sysbench.rand.default(9, 21))

    local q = string.format([[
        INSERT INTO reserva (fecha, hora_inicio, hora_fin, espacio_id, estado_reserva_id, solicitante_id)
        VALUES ('%s', '%s', '%s', %d, %d, %d)
    ]], fecha, hora_inicio, hora_fin, espacio_id, estado_reserva_id, solicitante_id)
    
    -- Ignorar errores de llave foránea si las semillas (1..50) no existen aún, 
    -- o asegurar que existan personas
    con:query(q)
end
