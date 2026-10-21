# Servicio de voz de The Void Files (legado)

Este directorio es el servicio de voz **anterior**. El juego actual sintetiza
voz en el mismo proceso FastAPI (`/speech`, `/voices`, `/access-key` en el
puerto 8765). No arrancar este servicio: comparte el puerto y duplica el
llavero.

La clave de ElevenLabs se guarda desde Ajustes del juego. ElevenLabs solo lee
la narración descriptiva de apertura del Archivo.

El resto de este archivo describe el proceso legado, por si hace falta
comparar contratos.

## Requisitos

- Python 3.11 o posterior.
- Una cuenta de ElevenLabs con una clave de acceso que tenga permiso de texto a voz y de lectura de voces.
- macOS (Llavero), Windows (Administrador de credenciales) o Linux con Secret Service.

## Puesta en marcha

Desde la raíz del proyecto:

```bash
cd voice_service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn voice_service_application:application --host 127.0.0.1 --port 8765
```

En Windows, la activación es `.venv\Scripts\activate`.

El servicio queda escuchando solo en `http://127.0.0.1:8765`. No debe iniciarse con `--host 0.0.0.0`. Solo acepta peticiones del juego servido en `http://127.0.0.1:5173` o `http://localhost:5173`.

La clave se escribe una sola vez desde la pantalla de Configuración del juego, en el panel «Voz real». La primera vez, macOS puede pedir permiso para que Python use el Llavero.

## Pruebas

```bash
cd voice_service
source .venv/bin/activate
python -m pytest -q tests
```

Las pruebas sustituyen el llavero por uno en memoria y simulan ElevenLabs: no usan la red ni tocan el llavero real.

## Puntos de acceso

| Método y ruta | Qué hace |
|---|---|
| `GET /service-status` | Indica si hay una clave guardada (nunca la clave) y el límite de caracteres por lectura. |
| `POST /access-key` | Recibe `{"access_key": "…"}` y la guarda en el llavero. |
| `DELETE /access-key` | Borra la clave del llavero. |
| `GET /voices` | Lista las voces de la cuenta, primero las que hablan español. |
| `POST /speech` | Recibe `{"text": "…", "voice_identifier": "…"}` y devuelve audio MP3 en flujo. Máximo 2500 caracteres. |

Los fallos se devuelven como `{"failure_name": "…"}`:

| Nombre | Código | Causa |
|---|---|---|
| `access_key_missing` | 409 | No hay clave guardada. |
| `access_key_malformed` | 422 | La clave enviada no tiene forma de clave. |
| `access_key_rejected` | 401 | ElevenLabs rechaza la clave o le faltan permisos. |
| `speech_quota_exhausted` | 402 | La cuenta agotó sus caracteres. |
| `speech_provider_busy` | 429 | Demasiadas peticiones a la vez. |
| `voice_not_found` | 404 | La voz elegida ya no existe en la cuenta. |
| `speech_provider_unreachable` | 504 | Sin red o ElevenLabs no responde. |
| `speech_provider_failed` | 502 | Otro fallo de ElevenLabs. |
| `speech_text_empty`, `voice_identifier_malformed`, `request_invalid` | 422 | Petición mal formada. |
| `speech_text_too_long` | 413 | Texto por encima del límite. |
| `access_key_vault_unavailable` | 503 | El llavero del sistema no está disponible. |
| `origin_not_allowed` | 403 | La petición viene de otra página. |

## Borrar la clave a mano

Desde el juego, con «Borrar la clave». También desde el Llavero de macOS, buscando `the_void_files_voice_service`.

## Modelo de voz

Se usa `eleven_multilingual_v2` con salida `mp3_44100_128`. Ambos valores están como constantes en `elevenlabs_speech_client.py`.
