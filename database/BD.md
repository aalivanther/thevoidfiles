# The Void Files — BD mínima verificable 0.2

Revisión de tu propuesta 0.1. Alcance cerrado: **usar un consumible y pagar un
desplazamiento**. Se entrega un esquema SQL ejecutable, datos de laboratorio y
transacciones de referencia comprobadas con pruebas. No es una nueva aplicación
ni depende del esqueleto anterior. El ZIP conserva `BD_original_0.1.md`.

## 1. Qué debe poder suceder

**Usar una bengala:** comprobar que el personaje vive, que le pertenece, que la
lleva consigo, que admite el uso solicitado y que queda cantidad suficiente.
Consumir la cantidad definida, avanzar el tiempo de la prueba, crear un efecto
de iluminación localizado y conservar un recibo. Todo se confirma junto.

**Pagar un transporte:** comprobar propietario de la oferta, origen actual,
vigencia, moneda, cuenta autorizada y saldo. Registrar el gasto, trasladar al
personaje, avanzar el tiempo y conservar el recibo en la misma transacción.

El modelo puede proponer una acción; Python verifica y calcula. No puede pasar
un nuevo saldo, precio, duración o cantidad a descontar como argumento de estas
operaciones. Los valores salen de las definiciones y ofertas existentes.

## 2. Cambios sobre tu propuesta

| Propuesta original | Decisión para esta prueba |
|---|---|
| `Player` | Se mantiene con FK a campaña y ubicación. Edad al inicio opcional; se elimina fecha de nacimiento duplicada. |
| `Stats` | Se mantiene, con `player_id` como PK/FK uno a uno. |
| `Inventario FK` | Se sustituye por filas `inventory_entry` que apuntan al jugador; no una columna que intente contener una colección. |
| `FinanceFixed` | Se pospone. Cuando exista calendario económico será una fila por obligación, importe, periodicidad y próximo vencimiento. |
| `FinanceVariables` | Se sustituye por cuentas y movimientos fechados mediante su acción. El saldo se deriva, no se edita. |
| `Campaing` | Se normaliza a `campaign`; almacena versión, tiempo de simulación y versión de reglas. |
| `Chapter` y `Mission` | Se posponen hasta probar el ciclo de un caso. No se fusionan por asumir que significan lo mismo. |
| Inventario en misión | No se duplica. `carried` distingue lo disponible para esta prueba. Almacenes concretos requieren una extensión. |
| Aliados, némesis, investigaciones, enemigos, recompensas | Pendientes. Sus relaciones múltiples necesitarán tablas de relación, no una FK individual. |
| Camino principal de solución | Pendiente del modelo de casos: verdad y condiciones privadas, con rutas previstas que no impidan alternativas coherentes. |

## 3. Tablas y campos

El SQL es la definición precisa de tipos y restricciones; este diccionario explica
su intención. Son **11 tablas y 2 vistas**, cada una necesaria para representar
el escenario o comprobar sus cambios. `money_movement` y `world_effect` son el
resultado detallado de las acciones; no se añade otra tabla genérica de eventos.

| Tabla | Campos principales | Responsabilidad |
|---|---|---|
| `campaign` | `id`, `name`, `state_version`, `world_seconds`, `rules_version` | Aislar partida, controlar concurrencia y llevar reloj simulado. |
| `location` | `id`, `campaign_id`, `name` | Lugares concretos del escenario; sin geografía real inventada. |
| `player` | `id`, `campaign_id`, `name`, `alias`, `age_at_start`, `location_id`, `serious_wounds`, `status` | Personaje y posición actual; un personaje por campaña en esta prueba. |
| `stats` | `player_id`, `im`, `if_stat`, `c`, `o`, `co`, `m`, `s` | Correspondencia directa con IM, IF, C, O, Co, M, S del Códice. |
| `item_definition` | `id`, `name`, `use_code`, `units_per_use`, `use_seconds`, `effect_code`, `effect_seconds`, `reference_value_minor`, `reference_currency` | Qué objeto es, su único uso implementado y los parámetros de laboratorio. |
| `inventory_entry` | `id`, `player_id`, `item_id`, `quantity`, `carried` | Existencias homogéneas poseídas por el jugador. |
| `account` | `id`, `player_id`, `kind`, `currency` | Fondos personales u operativos separados. El gasto operativo se rechaza hasta implementar sanción y reglas de uso. |
| `travel_offer` | `id`, `campaign_id`, `player_id`, `origin_id`, `destination_id`, `price_minor`, `currency`, `duration_seconds`, `expires_at_seconds` | Oferta de transporte fijada por el escenario y válida al momento de salir. |
| `action` | `id`, `campaign_id`, `player_id`, `command`, `request_json`, `request_hash`, `before_version`, `after_version`, `receipt_json`, `created_at` | Solicitud y resultado confirmado e inmutable. |
| `money_movement` | `id`, `account_id`, `player_id`, `action_id`, `offer_id`, `kind`, `amount_minor` | Apertura de saldo o gasto de transporte; nunca un saldo arbitrario enviado por IA. |
| `world_effect` | `id`, `campaign_id`, `action_id`, `location_id`, `code`, `starts_at_seconds`, `expires_at_seconds` | Iluminación persistente en el lugar donde se usó el objeto. |

`account_balance` calcula saldo con la suma de movimientos. `active_effect` devuelve
los efectos cuyo inicio ya ocurrió y cuyo vencimiento todavía no llegó.
La iluminación de la fixture se deja en el lugar de uso: no sigue al jugador al
viajar. Objetos sostenidos, cargas y efectos móviles requieren otro contrato.

## 4. Cardinalidades y decisiones de identidad

| Relación | Cardinalidad y regla |
|---|---|
| Campaña → jugador | Un jugador como máximo; la fixture crea uno. No hay transferencias entre campañas. |
| Jugador → estadísticas | Cero o una fila a nivel FK; el alta de la aplicación debe crear exactamente una junto al jugador. La fixture lo hace. |
| Campaña → ubicaciones | Varias; las FK compuestas impiden colocar al jugador en una ubicación de otra campaña. |
| Jugador → existencias | Varias; un stack por definición y disponibilidad (`carried`). |
| Jugador → cuentas | Varias; única combinación jugador/tipo/moneda. |
| Cuenta → movimientos | Varios; como máximo un movimiento de apertura. |
| Acción → resultado específico | En esta prueba: un efecto de uso o un movimiento de transporte. Python exige el resultado correspondiente. |
| Oferta → pago | Como máximo uno; una oferta aceptada no vuelve a cobrarse. |

Los IDs de laboratorio son legibles (`p1`, `bag`, `ride`). En una aplicación,
genera IDs estables, por ejemplo UUID; el modelo recibe los existentes y no los
inventa para acceder a otro recurso. `action_id` identifica la misma intención
y debe sobrevivir a un reintento de red.

## 5. Guardas de la base y del controlador

| Riesgo | Protección implementada |
|---|---|
| Cantidades negativas | `CHECK` en SQL y validación antes del descuento. |
| Dinero insuficiente | Consulta previa y trigger que impide que un movimiento deje saldo negativo. |
| Decimales monetarios imprecisos | Enteros en unidad menor: en EUR, 1200 representa 12 €. No hay conversión automática. |
| Mezcla de monedas | Comparación cuenta/oferta en Python y trigger para el movimiento. |
| Reescritura de gastos o recibos | Triggers impiden UPDATE y DELETE de movimientos y acciones. Correcciones contables futuras serán asientos nuevos. |
| Modificar el precio tras ofrecerlo | Oferta inmutable por UPDATE. Nueva condición requiere otra oferta. |
| Cobrar un importe distinto del ofertado | Trigger vincula importe, moneda, cuenta personal, dueño y tipo de acción a la oferta. |
| Usar recursos ajenos | Consultas por jugador y FK compuestas en relaciones económicas. |
| Acceder a ubicación de otra campaña | FK compuestas para jugador, ofertas y efectos. |
| Repetir consumo o pago | ID único de acción; la misma solicitud devuelve el recibo histórico sin ejecutar de nuevo. |
| Reutilizar ID con otra intención | Comparación del hash y JSON canónico completo; rechazo. |
| Dos acciones sobre el mismo estado | `BEGIN IMMEDIATE` + `expected_version`; solo una nueva acción confirma esa versión. |
| Fallo entre descuento y efecto/desplazamiento | Rollback de toda la transacción, incluido el recibo. |
| Acción de personaje muerto | Rechazo de nuevas acciones; cinco heridas graves no pueden coexistir con estado vivo. |
| Estadísticas iniciales inválidas | Trigger de INSERT: valores hasta 10, S=2 y suma ≤30. CHECK general hasta 50 para futura progresión. |
| Inyectar precio, saldo o cantidad por argumentos | Lista cerrada de campos; campos adicionales se rechazan. |
| Efecto que dura indefinidamente por olvido | Vencimiento persistido; la vista calcula vigencia con el reloj del mundo. |

Estas garantías dependen de usar el controlador y conexiones configuradas.
No todas son restricciones SQL: por ejemplo, un administrador con SQL directo
podría cambiar un inventario sin registrar acción. La BD no es un sistema de
permisos contra su propietario y la IA no tendrá ese acceso directo.

Las tablas usan `STRICT`. Se activa `foreign_keys=ON` en **cada conexión**, antes
de abrir la transacción. El error de una sentencia causa rollback explícito de
la operación completa en Python; no se presupone que SQLite siempre lo haga solo.
Referencias: [STRICT](https://www.sqlite.org/stricttables.html),
[claves foráneas](https://www.sqlite.org/foreignkeys.html),
[transacciones](https://www.sqlite.org/lang_transaction.html).

## 6. Contrato de las dos operaciones

Usar un objeto:

```json
{
  "action_id": "a1",
  "player_id": "p1",
  "expected_version": 0,
  "command": "use_item",
  "entry_id": "bag",
  "use_code": "ignite"
}
```

Pagar y desplazarse, después de ese uso:

```json
{
  "action_id": "a2",
  "player_id": "p1",
  "expected_version": 1,
  "command": "pay_travel",
  "offer_id": "ride",
  "account_id": "personal"
}
```

El uso descuenta `units_per_use` y genera `effect_code` definidos por el catálogo;
no interpreta qué efecto sería físicamente apropiado. Viajar paga exactamente
el precio ofertado y avanza su duración. Oferta vencida en el instante de salida
se rechaza; puede vencer durante un trayecto ya aceptado.

La transacción sigue este orden: validar forma → bloquear escritura → buscar
reintento confirmado → comprobar versión y estado → validar precondiciones →
calcular recibo → insertar acción y consecuencias → incrementar versión/reloj →
commit. La IA se consulta **fuera** de esa transacción.

Se registran únicamente acciones confirmadas. Un rechazo no cambia el mundo ni
reserva el ID en esta versión; una futura auditoría de intentos puede añadirse
por separado. Reenviar un ID ya confirmado devuelve el recibo de entonces, no
una consulta del estado actual. Para una acción nueva hay que leer la versión
actual. La interfaz futura debe conservar el ID cuando desconozca el resultado
de un envío.

## 7. Herramientas de IA y RAG: límite preciso

El laboratorio **no integra IA**. Estas son las futuras interfaces que este
esquema permite implementar, sin darle al modelo un editor SQL:

| Herramienta prevista | Tipo | Fuente y límite |
|---|---|---|
| `get_player_state` | Lectura exacta | Jugador, stats, ubicación, versión y reloj. |
| `get_inventory` | Lectura exacta | Existencias del jugador y usos registrados. |
| `get_accounts` | Lectura exacta | Saldos derivados, nunca recuperados por similitud. |
| `get_travel_offers` | Lectura exacta | Ofertas vigentes aplicables al origen y jugador. |
| `get_active_effects` | Lectura exacta | Efectos del lugar y reloj actuales. |
| `propose_use_item` | Propuesta | Referencia a objeto/uso disponible; no modifica la BD. |
| `propose_travel` | Propuesta | Referencia a oferta/cuenta; no inventa precio ni autoriza el pago. |

El controlador vincula la propuesta con la intención del jugador y decide si
corresponde ejecutarla. Una oferta cara descubierta por la IA no equivale a que
el jugador haya aceptado pagarla. Los campos `player_id`, versión e ID de acción
deben completarse o cotejarse desde el contexto confiable del controlador.

El archivo Python demuestra la confirmación, no esa autorización semántica. No
debe exponerse `execute()` directamente como herramienta sin esa capa. Tampoco
se implementan aquí herramientas de lectura HTTP: la tabla describe sus futuros
contratos. El RAG de historia y secretos se añadirá con el caso; no hace falta
una BD vectorial para comprobar estas dos interacciones numéricas.

## 8. Escenario de aceptación

Todo valor económico y temporal siguiente pertenece exclusivamente a la fixture,
no añade reglas al Códice:

| Momento | Bengalas | Saldo personal | Ubicación | Reloj | Versión |
|---|---:|---:|---|---:|---:|
| Inicial | 2 | 50 € | Portón | 0 s | 0 |
| Encender una | 1 | 50 € | Portón | 5 s | 1 |
| Pagar transporte | 1 | 38 € | Estación | 905 s | 2 |
| Repetir exactamente el envío de transporte | 1 | 38 € | Estación | 905 s | 2 |

La iluminación del portón comienza en el segundo 5 y vence en el 605. Sigue
existiendo como antecedente, pero ya no está activa cuando se llega a la estación.
Tiempo físico simulado y Entropía son distintos: esta prueba no calcula Entropía.

## 9. Límites deliberados

- Una campaña tiene un personaje; no hay traspaso de ese personaje entre campañas.
- Se implementa un único uso de un consumible homogéneo, no durabilidad ni cargas.
- El valor de referencia del objeto no es un precio garantizado de compraventa.
- Solo se gastan fondos personales mediante ofertas de transporte fijas.
- No hay crédito, cambio de moneda, comercio, cobros periódicos ni reembolsos.
- La fecha real de la acción sirve para auditoría; el juego usa `world_seconds`.
- No se procesan encuentros durante un viaje ni sus consecuencias narrativas.
- No hay casos, pistas, PNJ, combate, XP, recompensas ni restauraciones implementadas.
- La edad al inicio queda como dato biográfico; no hay envejecimiento automático.
- Las definiciones del catálogo y el escenario son configuración confiable. Su
  edición futura necesitará versionado; no se permite como herramienta de la IA.
- El alta de personajes personalizada y la migración de partidas quedan fuera;
  la fixture crea un estado inicial válido. No se elimina la futura necesidad de
  validar coherencia semántica ni de revisar la evolución del esquema.

## 10. Archivos y ejecución

| Archivo | Uso |
|---|---|
| `schema.sql` | Esquema completo, índices, vistas y triggers. |
| `fixture.sql` | Datos deterministas de laboratorio. |
| `transactions.py` | Dos operaciones de referencia; sin dependencias externas. |
| `test_transactions.py` | Pruebas de integridad, rollback, concurrencia e idempotencia. |
| `BD_original_0.1.md` | Tu propuesta original sin modificaciones. |
| `VERIFICACION.md` | Resultado real y límites de la comprobación. |

Desde la carpeta descomprimida:

```bash
python3 transactions.py
python3 -m unittest -v test_transactions
```

En Windows puedes usar `py -3` en lugar de `python3`. La demo y las pruebas crean
bases temporales y las eliminan al terminar. Requiere Python 3.10+ y SQLite 3.37+
con funciones JSON; comprueba tu instalación con
`python3 -c "import sqlite3; print(sqlite3.sqlite_version)"`.
No hay instalación de paquetes, servidor, interfaz o API de pago.

Para inspeccionar manualmente una base persistente nueva:

```bash
python3 -c "from transactions import initialize; initialize('laboratorio.sqlite3')"
```

Abre esa base con tu gestor SQL. No ejecutes `initialize` sobre una base existente:
fallará al encontrar tablas. Este esquema no migra automáticamente el proyecto
anterior. Conserva copias al comenzar a modificarlo.
