# Horario Productivo — SDD con GitHub Spec Kit

Repositorio de **Spec-Driven Development (SDD)** para construir una aplicación web
que **genera tu horario semanal y controla tu productividad**. El desarrollo se
guía con **[GitHub Spec Kit](https://github.com/github/spec-kit)** (`specify` CLI):
primero se escriben principios, especificación, plan y tareas, y después un agente
de IA (Claude Code) implementa el código a partir de esos artefactos.

## ¿De qué trata el producto?
Quien estudia o trabaja tiene muchas tareas y poco tiempo libre. La app:

1. **Genera el horario**: el usuario indica su disponibilidad semanal (franjas
   libres por día) y sus tareas (duración, prioridad, fecha límite). Con un clic
   el sistema reparte las tareas en los huecos libres, de la más prioritaria y
   urgente a la menos, sin solapes.
2. **Controla la productividad**: cada bloque se marca como completado u omitido,
   y un panel muestra el % de cumplimiento, las horas planificadas frente a las
   completadas, las tareas terminadas y la racha de días productivos.

Detalle completo del alcance del mini-MVP: [docs/producto.md](docs/producto.md).

## Stack tecnológico
| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite + TypeScript |
| Backend | NestJS + TypeScript + Prisma |
| Base de datos | PostgreSQL (Neon, desde Vercel Marketplace) |
| Despliegue | Vercel: un proyecto para el frontend y otro para el backend |
| SDD | GitHub Spec Kit + Claude Code |

Arquitectura y diagrama de Excalidraw: [docs/arquitectura.md](docs/arquitectura.md) ·
[docs/arquitectura.excalidraw](docs/arquitectura.excalidraw).

## ¿Qué es SDD y cómo se usa aquí?
En Spec-Driven Development la **especificación es la fuente de verdad**: el código
se deriva de ella y no al revés. Spec Kit organiza el trabajo en fases, cada una
con un comando del agente:

| Fase | Comando | Artefacto generado |
|------|---------|--------------------|
| Principios | `/speckit-constitution` | `.specify/memory/constitution.md` |
| Qué y por qué | `/speckit-specify` | `specs/NNN-feature/spec.md` |
| Dudas | `/speckit-clarify` | sección *Clarifications* en `spec.md` |
| Cómo | `/speckit-plan` | `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md` |
| Calidad (opcional) | `/speckit-checklist` | `checklists/*.md` |
| Tareas | `/speckit-tasks` | `tasks.md` |
| Coherencia | `/speckit-analyze` | informe (no modifica archivos) |
| Código | `/speckit-implement` | `frontend/`, `backend/` |
| Cierre | `/speckit-converge` | tareas pendientes añadidas a `tasks.md` |

👉 La **lista de prompts listos para copiar** está en [docs/prompts.md](docs/prompts.md).

## Estructura del repositorio
```
.
├── AGENTS.md              # Reglas para agentes de IA (stack, estilo, reglas)
├── CLAUDE.md              # Importa AGENTS.md para Claude Code
├── README.md
├── docs/
│   ├── producto.md        # Visión y alcance del mini-MVP (entrada de /speckit-specify)
│   ├── arquitectura.md    # Arquitectura objetivo y decisiones
│   ├── arquitectura.excalidraw  # Diagrama editable en excalidraw.com
│   └── prompts.md         # Prompts en orden para probar el SDD
├── specs/                 # Lo crea /speckit-specify (una carpeta por feature)
├── .specify/              # Spec Kit: constitución, plantillas, scripts PowerShell
└── .claude/skills/        # Skills /speckit-* para Claude Code
```

## Puesta en marcha
Requisitos: Git, Python 3.11+, [uv](https://docs.astral.sh/uv/), Node 20+, Claude Code.

```bash
# 1. Instalar la CLI de Spec Kit (una sola vez)
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git

# 2. Clonar el repo
git clone https://github.com/marianZamorano/sdd-horario-productividad.git
cd sdd-horario-productividad

# 3. Verificar herramientas
specify check
```

Este repo ya está inicializado con
`specify init --here --integration claude --script ps`, así que no hace falta
volver a ejecutarlo. Abre la carpeta en VS Code con Claude Code y sigue
[docs/prompts.md](docs/prompts.md) desde el paso 1.

## Estado
- [x] Repositorio SDD inicializado con Spec Kit (integración Claude, scripts PowerShell)
- [x] Visión de producto, arquitectura y diagrama
- [ ] Constitución (`/speckit-constitution`)
- [ ] Spec, plan y tareas del MVP
- [ ] Implementación del MVP
- [ ] Deploy en Vercel
