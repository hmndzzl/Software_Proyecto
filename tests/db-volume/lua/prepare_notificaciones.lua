function thread_init()
    drv = sysbench.sql.driver()
    con = drv:connect()
    con:query("SET FOREIGN_KEY_CHECKS=0")
end

function thread_done()
    con:disconnect()
end

function event()
    local persona_id = sysbench.rand.default(1, 100)
    local notificacion_id = sysbench.rand.default(1, 1000)
    
    local q = string.format([[
        INSERT IGNORE INTO persona_notificacion (persona_id, notificacion_id, leida, asistencia_confirmada)
        VALUES (%d, %d, %d, %d)
    ]], persona_id, notificacion_id, sysbench.rand.default(0,1), sysbench.rand.default(0,1))
    
    con:query(q)
end
