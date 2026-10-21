# Verificación de la BD mínima 0.2 (reconstrucción)

`schema.sql`, `fixture.sql`, `transactions.py` y `test_transactions.py` se
**reescribieron a partir de `BD.md`** el 2026-09-18 porque los originales del ZIP
no se conservaron. No son copia byte a byte de aquella entrega: cumplen el mismo
contrato documentado. `BD_original_0.1.md` no puede reconstruirse y sigue ausente.

## Resultado real

Entorno: Python 3.14.3, SQLite 3.50.4, macOS (Darwin 27.0.0).

```
python3 transactions.py                     → tabla del escenario de aceptación correcta
python3 -m unittest test_transactions       → Ran 37 tests — OK
```

Escenario obtenido: 2→1 bengalas, 50 €→38 €, Portón→Estación, reloj 0→5→905 s,
versión 0→1→2; repetir el envío de transporte no cambia nada. Iluminación del
portón activa de 5 s a 605 s e inactiva al llegar a la estación.

## Qué cubren las pruebas

| Grupo | Comprobado |
|---|---|
| Escenario | Los cuatro momentos de BD.md §8 y las dos vistas. |
| Idempotencia | Reintento devuelve recibo histórico (también desde otra conexión); mismo ID con otra intención se rechaza; un rechazo no reserva el ID. |
| Versión y concurrencia | Versión antigua no cambia nada; dos hilos sobre la misma versión confirman solo uno; `UNIQUE (campaign_id, before_version)` en SQL. |
| Rollback | Fallo inyectado tras consumir, tras pagar y antes del commit: estado, acción y consecuencias intactos. |
| Forma | Campos extra (precio, saldo, cantidad, duración), faltantes, tipos y comando desconocido. |
| Inventario | Cantidad insuficiente, no llevado, uso no admitido, existencias ajenas. |
| Transporte | Cobro único, origen incorrecto, vencimiento en la salida, saldo, moneda, fondo operativo, recursos ajenos, oferta inmutable. |
| Guardas SQL | FK activas, asientos y recibos inmutables, sobregiro e importe distinto del ofertado, apertura única, FK compuestas entre campañas, un jugador por campaña, muerte con cinco heridas, límites de stats, tablas STRICT, `initialize` sobre base existente. |

## Decisiones tomadas donde BD.md no fija el detalle

- `amount_minor` lleva signo: apertura ≥ 0, pago de transporte < 0. El saldo es la suma.
- Una oferta vence cuando `world_seconds >= expires_at_seconds` en la salida.
- El efecto comienza al terminar el uso (`world_seconds + use_seconds`).
- `UNIQUE (campaign_id, before_version)` en `action` refuerza en SQL que una versión
  solo se confirma una vez.
- Un recurso ajeno responde igual que uno inexistente (`*_not_found`).
- `_checkpoint()` es un punto de inyección de fallos solo para pruebas.

## Límites de esta comprobación

- La concurrencia se probó con dos hilos y dos conexiones en un único equipo.
- No se probó corte de energía ni corrupción de archivo; se confía en SQLite.
- Las garantías dependen de usar `connect()` y `execute()`. Un administrador con
  SQL directo puede alterar inventario o reloj sin registrar acción.
- No hay IA, HTTP, casos, pistas, PNJ, Entropía, XP ni checkpoints.
- No se ha ejecutado en Windows ni con SQLite < 3.37.
