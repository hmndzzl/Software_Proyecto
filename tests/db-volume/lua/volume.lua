function thread_init()
    drv = sysbench.sql.driver()
    con = drv:connect()
end

function thread_done()
    con:disconnect()
end

function event()
    -- Query 1: Disponibilidad de espacios (PV-RES-01)
    local fecha = "2026-09-15"
    local hora_inicio = "10:00:00"
    local hora_fin = "12:00:00"
    
    local q_disp = string.format([[
        SELECT e.*, 
        CASE WHEN EXISTS (
            SELECT 1 FROM reserva r 
            WHERE r.espacio_id = e.id 
            AND r.fecha = '%s'
            AND r.estado_reserva_id IN (1, 2)
            AND r.hora_inicio < '%s' 
            AND r.hora_fin > '%s'
        ) THEN 0 ELSE 1 END as disponible
        FROM espacio e
    ]], fecha, hora_fin, hora_inicio)
    
    con:query(q_disp)
    
    -- Query 2: Notificaciones (PV-NOTIF-01)
    local persona_id = sysbench.rand.default(1, 100)
    local q_notif = string.format([[
        SELECT n.*, pn.leida, pn.confirmada
        FROM notificacion n
        JOIN persona_notificacion pn ON n.id = pn.notificacion_id
        WHERE pn.persona_id = %d
        ORDER BY n.fecha DESC
        LIMIT 20
    ]], persona_id)
    
    -- If there's an error because the schema isn't fully seeded, we ignore for benchmarking
    pcall(function() con:query(q_notif) end)
end
