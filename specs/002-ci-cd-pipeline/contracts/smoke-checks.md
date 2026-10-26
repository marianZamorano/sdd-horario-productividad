# Contrato: comprobaciones HTTP del pipeline

Peticiones que hacen las pruebas de arranque, la integración y la verificación de
producción, y la respuesta exacta que se considera éxito. El endpoint `GET /api/health` ya
existe (feature 001, `@Public()`, responde `{"status":"ok"}`); esta feature no añade ni
cambia endpoints.

Todas las esperas usan `curl --silent --fail --retry 30 --retry-delay 2 --retry-connrefused
--retry-all-errors --max-time 5` (≈ 60 s como máximo), salvo que se indique otra cosa. Una
comprobación que agota los reintentos hace fallar su paso.

## Backend

### B1. Health

| | |
|---|---|
| Petición | `GET {API}/api/health` |
| Éxito | HTTP 200 y cuerpo exactamente `{"status":"ok"}` |
| Dónde | `backend / validate` (`{API}` = `http://localhost:3000`), `backend / deploy` (`{API}` = `PROD_API_URL`) |

## Frontend

### F1. Página principal

| | |
|---|---|
| Petición | `GET {WEB}/` |
| Éxito | HTTP 200 y el cuerpo contiene `<div id="root">` |
| Dónde | `frontend / validate` (`{WEB}` = `http://localhost:4173`, `vite preview`), `frontend / deploy` (`{WEB}` = `PROD_WEB_URL`) |

## Integración (`integration / integration`)

Backend en `http://localhost:3001` con `CORS_ORIGIN=http://localhost:4173`; frontend
compilado con `VITE_API_URL=http://localhost:3001` y servido en `http://localhost:4173`.

| # | Comprobación | Petición | Éxito |
|---|--------------|----------|-------|
| I1 | Health del backend | `GET http://localhost:3001/api/health` | igual que B1 |
| I2 | Frontend servido | `GET http://localhost:4173/` | igual que F1 |
| I3 | Frontend apunta al backend | `grep -r "http://localhost:3001" frontend/dist/assets` | al menos una coincidencia |
| I4 | CORS acepta el frontend | `OPTIONS http://localhost:3001/api/auth/login` con `Origin: http://localhost:4173`, `Access-Control-Request-Method: POST`, `Access-Control-Request-Headers: authorization,content-type` | HTTP 204 y cabecera `Access-Control-Allow-Origin: http://localhost:4173` |
| I5 | CORS rechaza otros orígenes | la misma petición con `Origin: http://evil.example` | la respuesta **no** incluye `Access-Control-Allow-Origin` |

I4 e I5 se hacen sin reintentos (el backend ya respondió en I1). I3 usa el puerto 3001
precisamente porque el cliente usa `http://localhost:3000` por defecto: encontrar el 3001
demuestra que `VITE_API_URL` se aplicó en el build.

## Comportamiento de CORS tras esta feature

`CORS_ORIGIN` es una lista separada por comas de orígenes **exactos**
(`esquema://host[:puerto]`, sin barra final). Se acepta una petición si no trae cabecera
`Origin` (curl, health checks) o si su `Origin` es igual a una de las entradas. Desaparece
el comodín `*` que existía para los previews (FR-021, research R13).
