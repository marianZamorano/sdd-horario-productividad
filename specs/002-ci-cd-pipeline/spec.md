# Feature Specification: Pipeline de CI/CD

**Feature Branch**: `002-ci-cd-vercel`

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "Pipeline de CI/CD para Horario Productivo. Cada push y cada pull request deben validar automáticamente el proyecto antes de desplegar nada: instalar dependencias de backend y frontend, ejecutar lint, tests unitarios, tests e2e del backend contra un Postgres desechable, build de ambos paquetes, y una prueba de arranque que levante el backend real con su base de datos, aplique las migraciones y compruebe que GET /api/health responde {"status":"ok"} y que el frontend compilado se sirve. Si cualquier paso falla, no se despliega. Un push a main que pase todas las comprobaciones despliega a producción los dos proyectos de Vercel (horario-api y horario-web). Un pull request que pase las comprobaciones genera un deploy de preview de ambos y publica las URLs en el PR. Las migraciones de Prisma solo se aplican en el deploy de producción, nunca en previews, porque las previews comparten la base Neon de producción. Los secretos (token de Vercel e IDs de proyecto) nunca van en el repositorio. Fuera de alcance: entornos de staging, notificaciones por Slack o email, despliegue de otros servicios."

## Clarifications

### Session 2026-10-26

- Q: Si la validación de un solo paquete falla, ¿se despliega el paquete que sí pasó? → A: Sí. Backend y frontend se validan y despliegan de forma independiente: cada uno se despliega si pasan sus propias comprobaciones, aunque el otro falle.
- Q: Si se hace push a una rama distinta de `main`, ¿debe desplegarse algo? → A: No. No se usan pull requests ni previews: el trabajo se sube directamente a `main`, y cada push a `main` se valida (por separado backend y frontend) y despliega a producción. Los pushes a otras ramas solo se validan, nunca se despliegan.
- Q: ¿El workflow que valida backend y frontend juntos debe bloquear el despliegue? → A: No. Es un workflow adicional de integración que se ejecuta en cada push a `main` en paralelo con los demás y se marca en rojo si la integración falla, pero no bloquea los despliegues independientes de cada paquete.
- Q: ¿Cuánto es lo máximo que debe tardar el pipeline desde el push a `main` hasta producción? → A: 15 minutos en total, con un límite de 10 minutos por flujo; un flujo que lo supera se corta y queda como fallido.
- Q: Si los tests pasan pero el despliegue en Vercel falla, ¿qué hacemos? → A: Reintentar el despliegue 1 vez automáticamente; si vuelve a fallar, el flujo queda en rojo, producción sigue sirviendo la versión anterior y las migraciones ya aplicadas se mantienen (no se revierten). La recuperación es manual (re-ejecutar el flujo o hacer push de un arreglo).

## User Scenarios & Testing *(mandatory)*

Los actores son las personas que desarrollan Horario Productivo, que suben sus cambios
directamente a `main` (no se usan pull requests). El "usuario" de esta feature es el
equipo de desarrollo; el beneficio indirecto lo reciben los usuarios finales, que nunca
ven en producción un paquete que no haya pasado sus comprobaciones.

### User Story 1 - Validación automática por paquete en cada push (Priority: P1)

Cada vez que alguien hace push a cualquier rama, backend y frontend se validan solos, sin
intervención manual, cada uno en su propio flujo y con su propio resultado:

- **Backend**: instalar dependencias, lint, tests unitarios, tests e2e contra una base de
  datos desechable, build y prueba de arranque (backend compilado con su base de datos y
  migraciones aplicadas, respondiendo al chequeo de salud).
- **Frontend**: instalar dependencias, lint, tests unitarios, build y prueba de arranque
  (el frontend compilado se sirve).

El resultado (verde/rojo por paquete, y qué paso falló) queda visible en el commit.

**Why this priority**: es la base de todo lo demás. Sin una validación fiable no se puede
desplegar con seguridad, y sustituye la comprobación manual de los quality gates de la
constitución.

**Independent Test**: subir una rama con un cambio correcto y comprobar que ambos flujos
quedan en verde; subir otra con un test roto, un error de lint o un build roto en un solo
paquete y comprobar que solo ese flujo queda en rojo indicando el paso que falló.

**Acceptance Scenarios**:

1. **Given** una rama con código correcto, **When** se hace push, **Then** se ejecutan los
   flujos de backend y de frontend con todas sus comprobaciones y ambos quedan "aprobado".
2. **Given** una rama con un test unitario o e2e que falla, **When** se hace push, **Then**
   el flujo del paquete afectado queda "fallido", se identifica el paso concreto que
   falló, y el flujo del otro paquete no se ve afectado.
3. **Given** una rama con un error de lint en un paquete, **When** se hace push, **Then**
   el flujo de ese paquete falla en el paso de lint.
4. **Given** una rama cuyo backend compila pero no arranca (p. ej. una migración inválida o
   un error al iniciar), **When** se ejecuta su prueba de arranque, **Then** el flujo del
   backend falla porque el chequeo de salud no responde `{"status":"ok"}`.
5. **Given** una rama cuyo frontend compilado no puede servirse, **When** se ejecuta su
   prueba de arranque, **Then** el flujo del frontend falla.
6. **Given** un push a una rama distinta de `main`, **When** terminan los flujos, **Then**
   no se despliega nada, pasen o no.

---

### User Story 2 - Despliegue automático a producción desde main (Priority: P2)

Cuando se hace push a `main`, cada paquete cuyas comprobaciones pasan se despliega a
producción en su proyecto de Vercel: `horario-api` (backend, aplicando antes las
migraciones pendientes a la base de producción) y `horario-web` (frontend). Un paquete con
alguna comprobación en rojo no se despliega, pero no bloquea al otro.

**Why this priority**: elimina el despliegue manual y garantiza que cada paquete en
producción corresponde a una versión validada de `main`. Depende de la US1.

**Independent Test**: hacer push a `main` de un cambio visible (p. ej. un texto de la UI
o una migración nueva) y comprobar que, tras la validación en verde, producción muestra el
cambio y el chequeo de salud de producción responde `{"status":"ok"}`; repetir con un
cambio que rompe un test de un paquete y comprobar que ese paquete no cambia en producción.

**Acceptance Scenarios**:

1. **Given** un push a `main` en el que ambos paquetes pasan sus comprobaciones, **When**
   terminan los flujos, **Then** se aplican las migraciones pendientes contra la base de
   producción y se despliegan a producción `horario-api` y `horario-web`.
2. **Given** un push a `main` en el que fallan las comprobaciones del backend y pasan las
   del frontend, **When** terminan los flujos, **Then** no se aplica ninguna migración ni
   se despliega `horario-api` (sigue la versión anterior), y `horario-web` sí se despliega.
3. **Given** un push a `main` en el que fallan las comprobaciones del frontend y pasan las
   del backend, **When** terminan los flujos, **Then** se aplican las migraciones y se
   despliega `horario-api`, y `horario-web` sigue en la versión anterior.
4. **Given** un push a `main` en el que la aplicación de migraciones falla, **When** se
   intenta desplegar, **Then** no se despliega `horario-api` y su flujo queda marcado como
   fallido; el despliegue del frontend no depende de este fallo.
5. **Given** un despliegue del backend a producción completado, **When** se consulta el
   chequeo de salud del backend de producción, **Then** responde `{"status":"ok"}`.
6. **Given** un paquete que pasó sus comprobaciones y cuyo despliegue en Vercel falla,
   **When** se detecta el fallo, **Then** el despliegue se reintenta 1 vez; si el
   reintento tiene éxito, el flujo queda en verde.
7. **Given** un despliegue que falla también en el reintento, **When** termina el flujo,
   **Then** el flujo queda "fallido", producción sigue sirviendo la versión anterior de ese
   paquete y, si era el backend, las migraciones ya aplicadas se mantienen.

---

### User Story 3 - Validación de integración backend + frontend (Priority: P3)

En cada push a `main` se ejecuta además un flujo de integración que levanta juntos el
backend compilado (con una base de datos desechable y las migraciones aplicadas) y el
frontend compilado, y comprueba que el backend responde al chequeo de salud, que el
frontend se sirve y que el frontend puede comunicarse con el backend. Este flujo es
informativo: si falla, se marca en rojo en el commit, pero no bloquea ni revierte los
despliegues de la US2.

**Why this priority**: detecta incompatibilidades entre paquetes que las validaciones por
separado no ven (posibles precisamente porque se despliegan de forma independiente), pero
no es imprescindible para desplegar. Depende de la US1.

**Independent Test**: hacer push a `main` de un cambio en el que backend y frontend pasan
sus validaciones por separado pero el frontend llama a un endpoint que el backend no
expone (o el backend rechaza el origen del frontend), y comprobar que el flujo de
integración queda en rojo mientras los despliegues independientes siguen su curso.

**Acceptance Scenarios**:

1. **Given** un push a `main` con backend y frontend compatibles, **When** se ejecuta el
   flujo de integración, **Then** queda "aprobado".
2. **Given** un push a `main` en el que el frontend compilado no logra comunicarse con el
   backend, **When** se ejecuta el flujo de integración, **Then** queda "fallido"
   indicando la comprobación que falló.
3. **Given** un push a `main` en el que el flujo de integración falla, **When** los flujos
   por paquete están en verde, **Then** los despliegues a producción de ambos paquetes se
   realizan igualmente.

---

### Edge Cases

- **Dos pushes seguidos a `main`**: los despliegues a producción de un mismo paquete no se
  ejecutan en paralelo; se procesan en orden y producción termina en la versión del último
  commit.
- **Varios pushes seguidos a una rama distinta de `main`**: una validación en curso de un
  commit ya superado puede cancelarse; solo importa el resultado del último commit.
- **Secretos ausentes o inválidos en un push a `main`**: el despliegue del paquete afectado
  falla con un error claro y su flujo queda en rojo.
- **El despliegue en Vercel falla tras pasar los tests** (p. ej. un error transitorio de la
  plataforma): se reintenta 1 vez. Si vuelve a fallar, el flujo queda en rojo y producción
  sigue con la versión anterior del paquete.
- **Migraciones aplicadas pero despliegue del backend fallido**: la base de producción
  queda con el esquema nuevo y el backend anterior sigue sirviendo; es seguro porque las
  migraciones son compatibles hacia atrás. Las migraciones no se revierten.
- **Solo un paquete pasa la validación**: se despliega solo ese paquete. Producción puede
  quedar temporalmente con backend y frontend de commits distintos; el flujo del paquete
  que falló queda en rojo hasta que un commit posterior lo corrija.
- **Cambio que toca a la vez backend y frontend** y solo uno pasa: el riesgo de
  incompatibilidad temporal se acepta; se mitiga diseñando los cambios de API compatibles
  hacia atrás (ver Assumptions) y el flujo de integración lo señala.
- **Migración destructiva o incompatible con la versión anterior del backend**: no se
  protege automáticamente; es responsabilidad de quien hace el cambio (ver Assumptions).
- **Base de datos desechable no disponible** al iniciar los e2e, la prueba de arranque o el
  flujo de integración: el flujo correspondiente falla (no se trata como éxito ni se omite
  el paso).
- **El chequeo de salud tarda en responder** al arrancar: se espera un tiempo razonable
  antes de declarar el fallo, siempre dentro del límite de tiempo del flujo.
- **Un paso se queda colgado** (p. ej. un test que no termina): el flujo se corta al
  alcanzar su límite de 10 minutos y queda "fallido"; su paquete no se despliega.

## Requirements *(mandatory)*

### Functional Requirements

**Validación por paquete (CI)**

- **FR-001**: La validación MUST ejecutarse automáticamente en cada push a cualquier rama.
- **FR-002**: Backend y frontend MUST validarse en flujos independientes, cada uno con su
  propio resultado; el fallo de uno no detiene ni marca como fallido al otro.
- **FR-003**: Cada flujo MUST instalar las dependencias de su paquete de forma
  reproducible (a partir de los ficheros de bloqueo versionados).
- **FR-004**: Cada flujo MUST ejecutar el lint de su paquete y fallar ante cualquier error.
- **FR-005**: Cada flujo MUST ejecutar los tests unitarios de su paquete.
- **FR-006**: El flujo del backend MUST ejecutar los tests e2e contra una base de datos
  PostgreSQL desechable, creada para esa ejecución y destruida al terminar, sin tocar
  ninguna base de datos compartida.
- **FR-007**: Cada flujo MUST compilar (build) su paquete.
- **FR-008**: El flujo del backend MUST incluir una prueba de arranque que levante el
  backend compilado con una base de datos desechable, aplique las migraciones sobre ella y
  compruebe que `GET /api/health` responde `{"status":"ok"}`.
- **FR-009**: El flujo del frontend MUST incluir una prueba de arranque que compruebe que el
  frontend compilado se sirve correctamente (la página principal responde con éxito).
- **FR-010**: Si cualquier paso de un flujo falla, ese flujo MUST quedar "fallido", MUST
  indicar qué paso falló y MUST impedir el despliegue de su paquete.
- **FR-011**: El resultado de cada flujo MUST quedar visible en el commit correspondiente.
- **FR-011a**: Cada flujo (backend, frontend, integración y despliegue de un paquete) MUST
  tener un límite de 10 minutos; al superarlo se corta y queda "fallido", lo que impide el
  despliegue de su paquete.

**Despliegue a producción (CD)**

- **FR-012**: En un push a `main`, cada paquete cuya validación pase por completo MUST
  desplegarse a producción en su proyecto (`horario-api` para el backend, `horario-web`
  para el frontend), con independencia del resultado del otro paquete y del flujo de
  integración.
- **FR-013**: Antes de desplegar el backend a producción, el pipeline MUST aplicar las
  migraciones pendientes contra la base de datos de producción; si la aplicación de
  migraciones falla, MUST NOT desplegarse `horario-api`. Este fallo no impide desplegar
  `horario-web`.
- **FR-013a**: Si el despliegue de un paquete en Vercel falla, el pipeline MUST
  reintentarlo 1 vez automáticamente. Si el reintento también falla, el flujo MUST quedar
  "fallido" indicando el error, producción MUST seguir sirviendo la versión anterior de
  ese paquete, y las migraciones ya aplicadas MUST NOT revertirse.
- **FR-014**: Los despliegues a producción de un mismo paquete MUST serializarse: nunca se
  ejecutan dos a la vez y, si se encolan varios, producción termina en la versión del
  último commit de `main`.
- **FR-015**: Los pushes a ramas distintas de `main` MUST NOT desplegar nada ni aplicar
  migraciones a ninguna base de datos compartida.
- **FR-016**: No se generan despliegues de preview: el único entorno de despliegue es
  producción.

**Validación de integración**

- **FR-017**: En cada push a `main`, MUST ejecutarse un flujo de integración que levante
  juntos el backend compilado (con base de datos desechable y migraciones aplicadas) y el
  frontend compilado, y compruebe que: (a) `GET /api/health` responde `{"status":"ok"}`,
  (b) el frontend compilado se sirve, y (c) una petición al backend con el origen del
  frontend servido es aceptada.
- **FR-018**: El flujo de integración MUST mostrar su resultado en el commit y MUST NOT
  bloquear, retrasar ni revertir los despliegues de los paquetes.

**Secretos**

- **FR-019**: El token de Vercel, los identificadores de organización/proyecto y la cadena
  de conexión de producción MUST almacenarse como secretos del sistema de CI y MUST NOT
  aparecer en el repositorio ni en los logs.
- **FR-020**: La documentación del repositorio MUST listar los nombres de los secretos
  necesarios y cómo obtenerlos, sin incluir sus valores.

### Key Entities

- **Flujo**: ejecución de una validación (backend, frontend o integración) para un commit
  concreto; tiene un resultado (aprobado/fallido) y el estado de cada paso.
- **Despliegue**: resultado de publicar un proyecto (`horario-api` o `horario-web`) en
  producción; tiene una URL y está asociado a un commit de `main`.
- **Secreto de despliegue**: credencial o identificador necesario para desplegar o migrar
  (token de Vercel, IDs de organización y proyecto, conexión a la base de producción);
  vive solo en el almacén de secretos del CI.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de los pushes obtienen un resultado de validación por paquete sin
  que nadie tenga que lanzar nada a mano.
- **SC-002**: 0 despliegues a producción de un paquete cuyas comprobaciones estén en rojo
  en ese commit.
- **SC-003**: Un push a `main` con un paquete en verde queda visible en producción en como
  máximo 15 minutos desde el push, sin pasos manuales.
- **SC-003a**: Ningún flujo se ejecuta más de 10 minutos; en condiciones normales cada
  flujo de validación termina en menos de 5 minutos.
- **SC-004**: 0 despliegues o migraciones disparados por pushes a ramas distintas de
  `main`.
- **SC-005**: 0 secretos presentes en el historial del repositorio o en los logs del
  pipeline.
- **SC-006**: Ante un fallo, quien desarrolla identifica el flujo y el paso que fallaron en
  menos de 1 minuto desde la página del resultado.

## Assumptions

- El repositorio está alojado en GitHub y se usa su sistema de CI integrado; los secretos
  se guardan en el almacén de secretos de ese sistema.
- Los proyectos de Vercel `horario-api` y `horario-web` y la base Neon de producción ya
  existen (feature 001) y las variables de entorno de runtime (`DATABASE_URL`,
  `JWT_SECRET`, `CORS_ORIGIN`, `VITE_API_URL`) ya están configuradas en Vercel.
- Los despliegues dejan de dispararse por la integración Git automática de Vercel y pasan a
  controlarse solo desde el pipeline, para que "si falla, no se despliega" sea cierto.
- Se trabaja sin pull requests: los cambios se suben directamente a `main`. Por tanto la
  validación de `main` ocurre después del push, no antes de un merge. Esto choca con la
  sección "Flujo de desarrollo y quality gates" de la constitución (verde antes de cada
  merge a `main` y un preview por PR), enmendada en la constitución v1.1.0.
- Las migraciones y los cambios de la API se diseñan compatibles hacia atrás (patrón
  expand/contract), porque backend y frontend pueden quedar desplegados en commits
  distintos; quien hace el cambio es responsable de evitar cambios incompatibles.
- No hay rollback automático (ni del código ni de las migraciones): tras el reintento
  automático, la recuperación ante un despliegue fallido se hace re-ejecutando el flujo o
  haciendo push de un arreglo.
- Fuera de alcance: pull requests y despliegues de preview, entornos de staging,
  notificaciones por Slack o email, y despliegue de servicios distintos de `horario-api` y
  `horario-web`.
