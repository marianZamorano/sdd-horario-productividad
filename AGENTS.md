# AGENTS.md — horario-productividad

## Proyecto
Aplicación web que **genera automáticamente un horario semanal** a partir de las
tareas y la disponibilidad del usuario, y **mide su productividad** (bloques
completados, horas planificadas vs. reales, rachas).
Se desarrolla con **Spec-Driven Development (SDD)** usando GitHub Spec Kit.

## Stack (no negociable sin enmendar la constitución)
- Frontend: React + Vite + TypeScript (`frontend/`)
- Backend: NestJS + TypeScript (`backend/`)
- Base de datos: PostgreSQL (Neon vía Vercel Marketplace), ORM Prisma
- Despliegue: Vercel (un proyecto para `frontend/` y otro para `backend/`)

## Comandos (cuando exista el código)
- Frontend: `cd frontend && npm run dev` · tests: `npm test`
- Backend: `cd backend && npm run start:dev` · tests: `npm test`
- Migraciones: `cd backend && npx prisma migrate dev`

## Estilo
- TypeScript estricto en frontend y backend.
- Identificadores y código en inglés; textos de UI y mensajes al usuario en español.
- Lógica de negocio pura (p. ej. el algoritmo de generación del horario) separada
  de controladores/componentes para poder testearla sin BD ni red.

## Reglas
- Lee `.specify/memory/constitution.md`, `docs/producto.md` y la spec activa en
  `specs/` antes de tocar código.
- No añadas dependencias, endpoints ni cambies el esquema de BD sin que estén en
  `plan.md` / `data-model.md` / `contracts/` de la spec activa.
- No modifiques archivos dentro de `specs/` salvo petición explícita o mediante
  los comandos `/speckit-*`.
- Nunca subas secretos: usa `.env` local (ignorado) y variables de entorno de Vercel.

## Al terminar cualquier tarea
- Ejecuta los tests del paquete que tocaste y confirma en tu respuesta que pasan.
- Marca la tarea como completada (`[X]`) en `tasks.md`.
