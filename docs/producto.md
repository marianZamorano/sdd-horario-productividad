# Producto — Generador de horario y control de productividad

> Documento de entrada para `/speckit-specify`. Describe el **qué** y el **por qué**,
> no el cómo. El cómo vive en `plan.md` de cada spec.

## Problema
Estudiantes y profesionales tienen muchas tareas con distinta prioridad y fecha
límite, pero poco tiempo libre y repartido. Planificar la semana a mano cuesta,
el plan se desactualiza enseguida y no hay forma sencilla de saber si se está
cumpliendo.

## Propuesta de valor
1. **Generar** un horario semanal realista en un clic, colocando cada tarea en
   los huecos libres según prioridad y fecha límite.
2. **Controlar** la ejecución: marcar cada bloque como hecho / no hecho y ver
   métricas simples de productividad.

## Usuario objetivo
Persona individual (estudiante universitario o profesional) que organiza su
propia semana. Sin equipos ni compartición en el MVP.

## Alcance del mini-MVP
| # | Capacidad | Descripción |
|---|-----------|-------------|
| 1 | Cuenta | Registro e inicio de sesión con email y contraseña. Cada usuario solo ve sus datos. |
| 2 | Disponibilidad | Definir franjas libres por día de la semana (p. ej. lun 18:00–22:00). |
| 3 | Tareas | Crear, editar, listar y borrar tareas: título, duración estimada (min), prioridad (alta/media/baja), fecha límite opcional, categoría opcional. |
| 4 | Generar horario | Para una semana dada, repartir las tareas pendientes en las franjas libres. Prioridad y fecha límite más cercana primero; una tarea larga puede partirse en bloques; las que no caben se muestran como "sin asignar". Regenerar reemplaza los bloques no completados. |
| 5 | Vista semanal | Calendario de lunes a domingo con los bloques generados. |
| 6 | Seguimiento | Marcar un bloque como completado u omitido. |
| 7 | Productividad | Panel con: % de bloques completados de la semana, horas planificadas vs. completadas, tareas completadas y racha de días con al menos un bloque completado. |

## Fuera de alcance (MVP)
Equipos/compartir, integración con Google Calendar, notificaciones push/email,
IA para estimar duraciones, apps móviles nativas, temporizador Pomodoro,
recurrencia de tareas, zonas horarias múltiples (se usa la del navegador).

## Criterios de éxito del MVP
- Un usuario nuevo puede registrarse, cargar disponibilidad y 5 tareas, y obtener
  su horario en menos de 3 minutos.
- La generación de una semana con 50 tareas tarda menos de 1 s.
- El algoritmo nunca solapa bloques ni coloca bloques fuera de la disponibilidad.
- La aplicación está desplegada y accesible en una URL pública de Vercel.
