<!--
Sync Impact Report
- Version change: 1.0.0 → 1.1.0 (MINOR: guía de flujo ampliada materialmente; ningún
  principio eliminado ni redefinido)
- Modified principles:
  II. Stack fijo → II. Stack fijo (añade CI/CD en GitHub Actions; los despliegues los
  dispara solo el pipeline, sin auto-deploy por Git de Vercel)
- Modified sections:
  "Flujo de desarrollo y quality gates": se eliminan los pull requests y los despliegues
  de preview; validación automática de cada push con flujos independientes por paquete;
  verificación local antes de push a main; despliegue independiente por paquete solo
  desde main; migraciones aplicadas solo por el pipeline y compatibles hacia atrás.
  "Governance": las enmiendas se proponen con un commit (no PR) y la verificación de
  cumplimiento la hace quien integra en main (no la revisión de PR).
- Added sections: ninguna
- Removed sections: ninguna
- Impacto en specs en curso:
  ✅ specs/002-ci-cd-pipeline: deja de haber conflicto (sin PR ni previews, push directo
  a main validado por el pipeline)
  ✅ specs/001-schedule-productivity-mvp: ya integrada con merge directo; sin cambios
- Templates y guías revisados (sin cambios necesarios):
  ✅ .specify/templates/plan-template.md (Constitution Check lee la constitución)
  ✅ .specify/templates/spec-template.md
  ✅ .specify/templates/tasks-template.md
  ✅ AGENTS.md (no menciona PRs ni previews)
  ⚠ README.md: la tarea pendiente "Flujo PR + preview por feature (T080–T081)" queda
  obsoleta y debe retirarse
- Follow-up TODOs: ninguno
-->

# Horario Productivo Constitution

Generador de horarios semanales con control de productividad. Esta constitución rige
todas las specs, planes, tareas y código del repositorio.

## Core Principles

### I. Spec primero

- No se escribe código de aplicación sin que la feature tenga `spec.md`, `plan.md` y
  `tasks.md` aprobados en `specs/NNN-feature/`.
- Todo cambio de alcance, de comportamiento o del modelo de datos MUST reflejarse primero
  en la spec (y, si aplica, en el plan y en los contratos) antes de tocar el código.
- El código que no se pueda rastrear a un requisito o a una tarea MUST eliminarse o
  justificarse con una enmienda de la spec.

**Razón**: la especificación es la fuente de verdad del SDD. Sin ella, el agente y las
personas divergen y el código deja de ser verificable contra un objetivo.

### II. Stack fijo

- Frontend: React + Vite + TypeScript, en `/frontend`.
- Backend: NestJS + TypeScript, en `/backend`.
- Persistencia: PostgreSQL, accedido solo a través de Prisma (esquema y migraciones
  versionados en `/backend/prisma`).
- Despliegue: Vercel, con un proyecto por carpeta (`frontend` y `backend`) y Neon Postgres
  instalado desde Vercel Marketplace.
- CI/CD: GitHub Actions. Los despliegues a Vercel los dispara solo el pipeline; el
  auto-deploy por integración Git de Vercel MUST estar desactivado.
- Cambiar cualquier pieza del stack MUST hacerse mediante una enmienda de esta
  constitución; no basta con decidirlo en un `plan.md`.

**Razón**: un stack estable permite que los planes y las tareas sean comparables entre
features y evita que el agente introduzca tecnologías por iniciativa propia.

### III. Núcleo testeable (NON-NEGOTIABLE)

- El algoritmo de generación del horario y el cálculo de las métricas de productividad
  MUST implementarse como funciones puras, sin acceso a BD, red ni reloj del sistema (la
  fecha actual se recibe como parámetro).
- Sus tests unitarios con Jest MUST escribirse antes que la implementación y fallar
  primero (Red → Green → Refactor).
- Cada endpoint REST MUST tener tests e2e con supertest que cubran el caso feliz, la
  validación de entrada y el acceso no autorizado.

**Razón**: el scheduler y las métricas son el valor central del producto; aislarlos
garantiza que sean correctos y que se puedan verificar en milisegundos.

### IV. Contratos explícitos

- La API REST de cada feature MUST documentarse en `specs/NNN-feature/contracts/`
  (método, ruta, request, response y códigos de error).
- El frontend MUST consumir solo endpoints documentados; un endpoint nuevo o modificado
  requiere actualizar antes el contrato.
- Todo DTO de entrada MUST validarse con class-validator y un `ValidationPipe` global con
  `whitelist` y `forbidNonWhitelisted`.

**Razón**: el contrato es el acuerdo entre frontend y backend; mantenerlo explícito evita
integraciones rotas y entradas no validadas.

### V. Seguridad básica

- Las contraseñas MUST almacenarse con bcrypt; nunca en texto plano ni con hash reversible.
- La autenticación usa JWT firmado con un secreto de entorno; los endpoints, salvo
  registro e inicio de sesión, MUST exigir un token válido.
- Cada consulta MUST filtrar por el usuario autenticado: un usuario nunca puede leer ni
  modificar datos de otro (se verifica con tests e2e).
- No se versionan secretos: los valores reales viven en `.env` (ignorado por Git) y en las
  variables de entorno de Vercel; el repo solo incluye `.env.example`.

**Razón**: la app guarda datos personales de organización; estos mínimos son baratos y
evitan las fugas más comunes.

### VI. Simplicidad (YAGNI)

- El MVP MUST limitarse a las capacidades listadas en `docs/producto.md`; lo marcado como
  "fuera de alcance" no se implementa.
- Se prefiere la solución más simple que cumpla la spec: sin capas, abstracciones ni
  dependencias que no exija un requisito concreto.
- Cualquier complejidad adicional MUST justificarse en la sección "Complexity Tracking"
  del `plan.md`.

**Razón**: un alcance acotado es lo que permite entregar un MVP funcional y desplegado.

## Restricciones técnicas

- TypeScript en modo `strict` en frontend y backend; `any` solo con comentario que lo
  justifique.
- Identificadores, código y commits en inglés; textos de UI y mensajes al usuario en
  español.
- ESLint y Prettier configurados en ambos paquetes; el código MUST pasar el lint sin
  errores.
- Configuración solo por variables de entorno (p. ej. `DATABASE_URL`, `JWT_SECRET`,
  `CORS_ORIGIN`, `VITE_API_URL`).

## Flujo de desarrollo y quality gates

- Una rama por feature, con el nombre que genera Spec Kit (`NNN-nombre-feature`).
- No se usan pull requests ni despliegues de preview: el único entorno de despliegue es
  producción.
- Cada push a cualquier rama MUST validarse automáticamente en el pipeline de CI, con un
  flujo independiente para backend y otro para frontend (dependencias, lint, tests
  unitarios, tests e2e del backend contra una base desechable, build y prueba de
  arranque).
- Los cambios se integran en `main` directamente (push o merge local, sin PR). Antes de
  hacer push a `main`, quien desarrolla MUST ejecutar en local lint y tests de los
  paquetes afectados.
- Un push a `main` despliega a producción solo los paquetes cuyo flujo esté en verde; un
  paquete en rojo MUST NOT desplegarse. Backend y frontend se despliegan de forma
  independiente.
- Solo `main` despliega; las demás ramas solo se validan.
- Las migraciones de Prisma se generan en la rama de la feature y solo las aplica el
  pipeline en el despliegue a producción desde `main`. Como backend y frontend pueden
  quedar desplegados en commits distintos, las migraciones y los cambios de API MUST ser
  compatibles hacia atrás (expand/contract).
- Las tareas completadas se marcan con `[X]` en `tasks.md` dentro del mismo cambio.

## Governance

- Esta constitución prevalece sobre cualquier otra guía del repositorio (`AGENTS.md`,
  `README.md`, planes). Ante un conflicto, se corrige el documento subordinado.
- **Enmiendas**: se proponen con un commit que modifica este archivo, actualiza el Sync Impact
  Report e indica el impacto sobre las specs en curso. Se ejecutan con
  `/speckit-constitution`.
- **Versionado** (SemVer): MAJOR si se elimina o redefine un principio de forma
  incompatible; MINOR si se añade un principio o sección, o se amplía materialmente una
  guía; PATCH si se aclara la redacción sin cambiar el significado.
- **Cumplimiento**: cada `plan.md` MUST pasar el "Constitution Check" antes de la fase de
  diseño y de nuevo después; `/speckit-analyze` trata cualquier violación de un MUST como
  CRITICAL. Quien integra un cambio en `main` verifica estos principios.
- La guía operativa para agentes de IA está en `AGENTS.md`.

**Version**: 1.1.0 | **Ratified**: 2026-10-26 | **Last Amended**: 2026-10-26
