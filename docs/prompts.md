# Prompts para probar el SDD hasta el mini-MVP

Ejecútalos **en orden** en Claude Code (chat de VS Code o terminal) con la raíz del
repo abierta. Cada paso genera artefactos en `.specify/` o `specs/`; revísalos y haz
commit antes de pasar al siguiente.

> Antes de los pasos 8 a 10 necesitas Node 20+ y, para el deploy, una cuenta de
> Vercel con la CLI instalada (`npm i -g vercel` y luego `vercel login`).

---

## 1. Constitución: principios del proyecto
```
/speckit-constitution Crea la constitución del proyecto "Horario Productivo", un generador de horarios semanales con control de productividad. Principios:
I. Spec primero: no se escribe código sin spec.md, plan.md y tasks.md aprobados; cualquier cambio de alcance pasa antes por la spec.
II. Stack fijo: frontend React + Vite + TypeScript en /frontend; backend NestJS + TypeScript en /backend; PostgreSQL con Prisma; despliegue en Vercel (un proyecto por carpeta) con Neon Postgres desde Vercel Marketplace. Cambiar el stack requiere enmendar la constitución.
III. Núcleo testeable: el algoritmo de generación de horario y el cálculo de métricas son funciones puras con tests unitarios (Jest) escritos antes que la implementación; los endpoints tienen tests e2e con supertest.
IV. Contratos explícitos: la API REST se documenta en specs/*/contracts/ y el frontend solo consume endpoints documentados; los DTO se validan con class-validator.
V. Seguridad básica: contraseñas con bcrypt, JWT, cada usuario solo accede a sus datos y no hay secretos en el repo (.env y variables de Vercel).
VI. Simplicidad (YAGNI): el MVP no incluye nada que no esté en docs/producto.md.
Restricciones: TypeScript estricto, código en inglés, UI en español, ESLint y Prettier. Flujo: rama por feature, tests en verde antes de cada merge, deploy de preview en Vercel por PR.
```

## 2. Especificación: qué y por qué
```
/speckit-specify Construir el mini-MVP de "Horario Productivo" descrito en docs/producto.md. Un usuario se registra e inicia sesión con email y contraseña. Define su disponibilidad semanal como franjas por día (por ejemplo lunes de 18:00 a 22:00). Gestiona sus tareas (crear, editar, listar, borrar) con título, duración estimada en minutos, prioridad alta/media/baja, fecha límite opcional y categoría opcional. Con un botón genera el horario de una semana: el sistema reparte las tareas pendientes en las franjas libres, primero por prioridad y luego por fecha límite más cercana, puede partir una tarea larga en varios bloques, nunca solapa bloques ni se sale de la disponibilidad, y muestra aparte las tareas que no cupieron. Regenerar reemplaza solo los bloques no completados. El usuario ve la semana en un calendario de lunes a domingo, marca cada bloque como completado u omitido y consulta un panel de productividad con el % de bloques completados, horas planificadas vs completadas, tareas terminadas y la racha de días con al menos un bloque completado. Fuera de alcance: equipos, Google Calendar, notificaciones, IA, recurrencia y apps móviles.
```

## 3. Clarificación: resolver ambigüedades (recomendado)
```
/speckit-clarify Enfócate en las reglas del algoritmo de generación (bloque mínimo y máximo, descansos entre bloques, desempate entre tareas, qué pasa con tareas vencidas) y en cómo se calcula la racha y las horas completadas.
```
Responde las preguntas que te haga (máximo 5). Si dudas, acepta la opción recomendada.

## 4. Plan técnico: cómo
```
/speckit-plan Usa el stack de la constitución. Monorepo con /frontend (React 18 + Vite + TypeScript, React Router, TanStack Query, un cliente fetch tipado, CSS simple o Tailwind) y /backend (NestJS 10+, Prisma, PostgreSQL, @nestjs/jwt, bcrypt, class-validator, Jest + supertest). Módulos del backend: auth, availability, tasks, schedule y stats, todos bajo el prefijo /api. El algoritmo de horario es una función pura en backend/src/schedule/scheduler.ts. Modelo de datos mínimo: User, AvailabilitySlot, Task y ScheduleBlock. Despliegue: dos proyectos de Vercel en el mismo repo (Root Directory frontend y backend); el backend corre como Vercel Function de NestJS; la BD es Neon instalada desde Vercel Marketplace (DATABASE_URL); el frontend lee VITE_API_URL; CORS limitado al dominio del frontend. En local usa Postgres con docker-compose o una rama de desarrollo de Neon. Genera research.md, data-model.md, contracts/ (OpenAPI o markdown por endpoint) y quickstart.md.
```

## 5. Checklist de calidad (opcional)
```
/speckit-checklist Crea un checklist de calidad de requisitos para la API y el algoritmo de horario: completitud, criterios medibles, casos límite (sin disponibilidad, tareas más largas que cualquier franja, semana vacía) y seguridad (aislamiento entre usuarios).
```

## 6. Tareas
```
/speckit-tasks Ordena las tareas por historia de usuario para entregar valor incremental: primero setup del monorepo y BD, luego auth, disponibilidad, tareas, generación de horario con vista semanal, seguimiento y panel de productividad, y al final el deploy en Vercel. Incluye las tareas de tests antes de cada implementación y marca con [P] las que se pueden hacer en paralelo.
```

## 7. Análisis de coherencia
```
/speckit-analyze
```
Si reporta problemas CRITICAL o HIGH, pide: `Corrige en spec.md, plan.md y tasks.md los hallazgos CRITICAL y HIGH del análisis.`

## 8. Implementación por fases
Es más estable implementar por bloques que todo de una vez:
```
/speckit-implement Ejecuta solo las fases de Setup y Fundacional (monorepo, NestJS, Prisma con migración inicial, app React base). Detente al terminar y muéstrame cómo verificarlo.
```
```
/speckit-implement Continúa con la historia de usuario de autenticación y la de disponibilidad, con sus tests. Detente al terminar.
```
```
/speckit-implement Continúa con gestión de tareas y generación del horario con vista semanal, incluidos los tests unitarios del scheduler. Detente al terminar.
```
```
/speckit-implement Completa seguimiento de bloques, panel de productividad y la fase de pulido. Ejecuta todos los tests del frontend y del backend.
```

## 9. Verificación local
```
Levanta Postgres, aplica las migraciones y arranca backend y frontend en local siguiendo specs/001-*/quickstart.md. Recorre el flujo completo: registrarse, cargar disponibilidad, crear 5 tareas, generar la semana, completar 2 bloques y ver el panel. Arregla lo que falle y confirma que los tests pasan.
```

## 10. Deploy en Vercel
```
Despliega el MVP en Vercel: crea un proyecto para /backend y otro para /frontend, instala Neon Postgres desde Vercel Marketplace y conéctalo al backend, configura JWT_SECRET, CORS_ORIGIN y VITE_API_URL, aplica las migraciones de Prisma contra Neon y despliega a producción. Dame las dos URLs y prueba el flujo completo en producción.
```

## 11. Cierre (opcional)
```
/speckit-converge
```
Compara el código con spec, plan y tareas, y añade a `tasks.md` lo que falte. Si añade tareas, vuelve a ejecutar `/speckit-implement`.

```
/speckit-taskstoissues
```
Convierte las tareas pendientes en issues de GitHub (necesita `gh` autenticado).
