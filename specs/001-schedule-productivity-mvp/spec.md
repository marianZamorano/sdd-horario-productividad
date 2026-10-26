# Feature Specification: Mini-MVP Horario Productivo

**Feature Branch**: `001-schedule-productivity-mvp`

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "Construir el mini-MVP de \"Horario Productivo\" descrito en docs/producto.md. Un usuario se registra e inicia sesión con email y contraseña. Define su disponibilidad semanal como franjas por día (por ejemplo lunes de 18:00 a 22:00). Gestiona sus tareas (crear, editar, listar, borrar) con título, duración estimada en minutos, prioridad alta/media/baja, fecha límite opcional y categoría opcional. Con un botón genera el horario de una semana: el sistema reparte las tareas pendientes en las franjas libres, primero por prioridad y luego por fecha límite más cercana, puede partir una tarea larga en varios bloques, nunca solapa bloques ni se sale de la disponibilidad, y muestra aparte las tareas que no cupieron. Regenerar reemplaza solo los bloques no completados. El usuario ve la semana en un calendario de lunes a domingo, marca cada bloque como completado u omitido y consulta un panel de productividad con el % de bloques completados, horas planificadas vs completadas, tareas terminadas y la racha de días con al menos un bloque completado. Fuera de alcance: equipos, Google Calendar, notificaciones, IA, recurrencia y apps móviles."

## Clarifications

### Session 2026-10-26

- Q: ¿Cuánto debe durar como mínimo y como máximo cada bloque de trabajo? → A: 25–50 min
  (estilo Pomodoro), en múltiplos de 5.
- Q: ¿Debe el generador dejar un descanso entre dos bloques seguidos dentro de la misma
  franja? → A: Sí, 5 min entre bloques consecutivos.
- Q: ¿Cómo se reparten los bloques de una misma tarea a lo largo de la semana? → A: Lo
  antes posible: cada tarea, en orden, ocupa los primeros huecos libres de la semana.
- Q: ¿Qué hace el generador con una tarea pendiente cuya fecha límite ya pasó? → A: La
  planifica primero, antes que cualquier otra tarea, sin restricción de fecha, y la marca
  como vencida.
- Q: ¿Cómo se cuentan las horas completadas de un bloque completado? → A: Se suma la
  duración completa planificada del bloque.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cuenta personal (Priority: P1)

Una persona crea su cuenta con email y contraseña, inicia sesión y cierra sesión. Todo lo
que crea (disponibilidad, tareas, horario) es privado y solo lo ve ella.

**Why this priority**: sin una identidad no hay datos propios que planificar; es la base
de todas las demás historias y la garantía de privacidad.

**Independent Test**: registrar una cuenta, cerrar sesión, volver a entrar y comprobar
que se accede a un espacio vacío propio; una segunda cuenta no ve nada de la primera.

**Acceptance Scenarios**:

1. **Given** un visitante sin cuenta, **When** se registra con un email válido y una
   contraseña de al menos 8 caracteres, **Then** queda dentro de la aplicación con su
   sesión iniciada.
2. **Given** un email ya registrado, **When** alguien intenta registrarse con él,
   **Then** el sistema lo rechaza con un mensaje claro sin revelar otros datos.
3. **Given** una cuenta existente, **When** el usuario introduce una contraseña
   incorrecta, **Then** ve un mensaje genérico de "credenciales inválidas".
4. **Given** dos usuarios A y B, **When** B intenta ver o modificar una tarea, franja o
   bloque de A, **Then** el sistema lo impide y lo trata como inexistente.

---

### User Story 2 - Disponibilidad semanal (Priority: P1)

El usuario define cuándo tiene tiempo libre cada semana mediante franjas por día de la
semana (por ejemplo lunes 18:00–22:00 y sábado 09:00–13:00). Puede añadir, editar y
borrar franjas.

**Why this priority**: es la entrada imprescindible del generador; sin franjas no hay
dónde colocar tareas.

**Independent Test**: crear varias franjas en distintos días, recargar y verlas
ordenadas por día y hora; intentar crear una franja inválida y ver el error.

**Acceptance Scenarios**:

1. **Given** un usuario sin franjas, **When** añade "lunes 18:00–22:00", **Then** la
   franja aparece en su disponibilidad del lunes.
2. **Given** una franja "lunes 18:00–22:00", **When** intenta añadir "lunes 21:00–23:00",
   **Then** el sistema rechaza la franja por solaparse con una existente.
3. **Given** una franja cuya hora de fin es igual o anterior a la de inicio, **When** la
   guarda, **Then** el sistema la rechaza indicando el motivo.

---

### User Story 3 - Gestión de tareas (Priority: P1)

El usuario crea, edita, lista y borra tareas con título, duración estimada en minutos,
prioridad (alta, media o baja), fecha límite opcional y categoría opcional. Ve cuánto le
queda de cada tarea y si está pendiente o terminada.

**Why this priority**: las tareas son lo que se planifica; junto con la disponibilidad
forman los datos mínimos para generar un horario.

**Independent Test**: crear 5 tareas con distintas prioridades y fechas, editar una,
borrar otra y comprobar que la lista refleja los cambios.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado, **When** crea una tarea "Estudiar cálculo", 120 min,
   prioridad alta, fecha límite viernes, **Then** la tarea aparece como pendiente con
   120 min restantes.
2. **Given** una tarea sin título, con duración menor que 15 min o que no es múltiplo de
   5, **When** el usuario
   la guarda, **Then** el sistema la rechaza indicando el campo inválido.
3. **Given** una tarea con bloques planificados, **When** el usuario la borra y
   confirma, **Then** la tarea y todos sus bloques desaparecen del horario.
4. **Given** una tarea pendiente, **When** el usuario la marca como terminada
   manualmente, **Then** deja de ser candidata para futuros horarios.

---

### User Story 4 - Generar el horario de la semana (Priority: P1)

Con un botón, el usuario genera el horario de una semana (lunes a domingo). El sistema
reparte las tareas pendientes en las franjas libres, ordenadas primero por prioridad y
luego por fecha límite más cercana (las vencidas van antes que todas); parte una tarea
larga en bloques de 25 a 50 minutos con 5 minutos de descanso entre bloques seguidos;
nunca solapa bloques ni se sale de la disponibilidad; y lista aparte las tareas
(o la parte de ellas) que no cupieron. Regenerar reemplaza solo los bloques todavía no
completados.

**Why this priority**: es la propuesta de valor central del producto ("tu horario en un
clic"); junto con las historias 1–3 constituye el MVP mínimo demostrable.

**Independent Test**: con 2 franjas y 3 tareas de prioridades distintas, generar la
semana y comprobar orden, ausencia de solapes, respeto de franjas y la lista de "sin
asignar"; completar un bloque, regenerar y verificar que ese bloque se conserva.

**Acceptance Scenarios**:

1. **Given** franja "lunes 18:00–20:00" y tareas A (alta, 50 min) y B (baja, 50 min),
   **When** genera la semana, **Then** A ocupa lunes 18:00–18:50 y B lunes 18:55–19:45
   (5 min de descanso entre ambos).
2. **Given** dos tareas de igual prioridad con fechas límite miércoles y viernes,
   **When** genera, **Then** la del miércoles se coloca antes.
3. **Given** una tarea de 120 min y una franja "lunes 18:00–22:00", **When** genera,
   **Then** la tarea queda en bloques de 50, 45 y 25 min (18:00–18:50, 18:55–19:40,
   19:45–20:10): el segundo bloque se acorta para que el resto no quede por debajo de
   25 min.
4. **Given** más minutos de tareas que de disponibilidad, **When** genera, **Then** las
   tareas o minutos que no caben aparecen en "sin asignar" con los minutos pendientes.
5. **Given** un horario con un bloque completado y otros planificados, **When**
   regenera, **Then** el bloque completado se mantiene intacto y los planificados se
   recalculan alrededor de él sin solaparse.
6. **Given** una tarea con fecha límite el martes, **When** genera, **Then** ningún
   bloque de esa tarea queda después de su fecha límite; lo que no cabe antes va a
   "sin asignar".
7. **Given** una tarea de prioridad baja cuya fecha límite ya pasó y una tarea de
   prioridad alta sin fecha, **When** genera, **Then** la tarea vencida ocupa los primeros
   huecos, se muestra marcada como vencida y la de prioridad alta va después.

---

### User Story 5 - Vista semanal y seguimiento (Priority: P2)

El usuario ve la semana en un calendario de lunes a domingo con sus bloques, navega a la
semana anterior o siguiente y marca cada bloque como completado u omitido (o lo devuelve
a planificado si se equivocó).

**Why this priority**: convierte el plan en algo accionable y produce los datos que
alimentan las métricas; el horario generado ya aporta valor sin ella, por eso va tras P1.

**Independent Test**: con un horario generado, abrir la vista semanal, marcar un bloque
como completado y otro como omitido, recargar y ver los estados persistidos.

**Acceptance Scenarios**:

1. **Given** un horario generado, **When** abre la vista semanal, **Then** ve cada bloque
   en su día y hora con el título de la tarea, su duración y su estado.
2. **Given** un bloque planificado, **When** lo marca como completado, **Then** su estado
   cambia y los minutos restantes de la tarea disminuyen en la duración del bloque.
3. **Given** que los bloques completados de una tarea suman su duración estimada,
   **When** se completa el último, **Then** la tarea pasa a terminada automáticamente.
4. **Given** un bloque marcado por error, **When** lo devuelve a planificado, **Then** el
   estado y los minutos restantes de la tarea se restauran.

---

### User Story 6 - Panel de productividad (Priority: P3)

El usuario consulta, para la semana seleccionada, el % de bloques completados, las horas
planificadas frente a las completadas, el número de tareas terminadas y su racha actual
de días con al menos un bloque completado.

**Why this priority**: da el "control de productividad" del producto, pero depende de
que existan bloques y seguimiento (P1 y P2).

**Independent Test**: con bloques en distintos estados y días conocidos, abrir el panel
y comparar cada métrica con el valor calculado a mano.

**Acceptance Scenarios**:

1. **Given** una semana con 10 bloques, 6 completados, 2 omitidos y 2 planificados,
   **When** abre el panel, **Then** ve 60 % de bloques completados.
2. **Given** bloques planificados por 8 h en la semana, de los que se completaron 5 h,
   **When** abre el panel, **Then** ve "8 h planificadas / 5 h completadas".
3. **Given** bloques completados ayer, anteayer y hoy, y ninguno hace 3 días, **When**
   abre el panel, **Then** la racha es de 3 días.
4. **Given** una semana sin bloques, **When** abre el panel, **Then** ve las métricas en
   cero con un mensaje que invita a generar el horario.

---

### Edge Cases

- Usuario sin franjas de disponibilidad que pulsa "generar": no se crean bloques, todas
  las tareas pendientes aparecen como sin asignar y se le indica que defina disponibilidad.
- Usuario sin tareas pendientes que pulsa "generar": se le informa de que no hay nada que
  planificar; no se borran bloques completados.
- Tarea más larga que cualquier franja: se divide en bloques en varias franjas; si aun así
  no cabe, el resto va a sin asignar.
- Tarea con fecha límite ya vencida: se planifica antes que todas las demás, sin
  restricción de fecha, y se muestra marcada como vencida; varias vencidas se ordenan
  entre sí por prioridad y luego por fecha límite más antigua.
- Tarea pendiente de menos de 25 min (o resto de menos de 25 min): se coloca como un único
  bloque de su duración real.
- Generar la semana en curso a mitad de semana: no se colocan bloques en momentos ya
  pasados.
- Franja que cruza la medianoche (p. ej. 23:00–01:00): no se admite; el usuario debe
  crear dos franjas.
- Editar o borrar franjas o tareas después de generar: los bloques existentes no se
  modifican solos; el usuario regenera para aplicar los cambios.
- Huecos libres menores de 25 min: no se usan, salvo para el bloque final de una tarea
  cuyo resto pendiente cabe entero en ese hueco.
- Sesión expirada mientras usa la app: se le redirige a iniciar sesión sin perder los
  datos ya guardados.

## Requirements *(mandatory)*

### Functional Requirements

**Cuenta y privacidad**

- **FR-001**: El sistema MUST permitir registrarse con email único y contraseña de al
  menos 8 caracteres.
- **FR-002**: El sistema MUST permitir iniciar y cerrar sesión; las credenciales
  inválidas producen un mensaje genérico.
- **FR-003**: El sistema MUST restringir cada franja, tarea, bloque y métrica a su
  propietario; los recursos de otro usuario se tratan como inexistentes.

**Disponibilidad**

- **FR-004**: Los usuarios MUST poder crear, editar, listar y borrar franjas definidas
  por día de la semana, hora de inicio y hora de fin, con granularidad de 15 minutos.
- **FR-005**: El sistema MUST rechazar franjas con fin menor o igual al inicio, que
  crucen la medianoche o que se solapen con otra franja del mismo día.

**Tareas**

- **FR-006**: Los usuarios MUST poder crear, editar, listar y borrar tareas con título
  (1–120 caracteres), duración estimada (15–1440 min, múltiplo de 5), prioridad
  (alta/media/baja), fecha límite opcional y categoría opcional (texto libre, máx. 40
  caracteres).
- **FR-007**: El sistema MUST mostrar para cada tarea su estado (pendiente/terminada) y
  sus minutos restantes (duración estimada menos minutos de bloques completados).
- **FR-008**: Una tarea MUST pasar a terminada automáticamente cuando sus bloques
  completados suman al menos su duración estimada, y los usuarios MUST poder marcarla
  como terminada o reabrirla manualmente.
- **FR-009**: Borrar una tarea MUST requerir confirmación y eliminar también todos sus
  bloques.

**Generación del horario**

- **FR-010**: Los usuarios MUST poder generar el horario de una semana concreta (lunes a
  domingo) con una sola acción.
- **FR-011**: El generador MUST considerar solo tareas pendientes con minutos restantes y
  ordenarlas así: primero las vencidas (fecha límite anterior al momento de generar);
  después por prioridad (alta > media > baja); después por fecha límite más cercana (las
  que no tienen fecha van al final); y, en caso de empate, por fecha de creación más
  antigua. Las vencidas se ordenan entre sí con los mismos criterios.
- **FR-012**: El generador MUST colocar bloques solo dentro de las franjas de
  disponibilidad, solo en momentos futuros, sin solaparse entre sí ni con los bloques
  conservados, y dejando 5 min de descanso entre dos bloques consecutivos de la misma
  franja (también respecto a los bloques conservados).
- **FR-013**: El generador MUST procesar las tareas en el orden de FR-011 y colocar cada
  una lo antes posible, en el primer hueco libre de la semana, en bloques de 25 a 50 min
  (múltiplos de 5) de la siguiente forma: el tamaño del bloque es el mínimo entre 50 min,
  el hueco libre y los minutos pendientes; si con ese tamaño el resto pendiente quedaría
  entre 1 y 24 min, el bloque se acorta para que el resto sea exactamente 25 min. Un resto
  pendiente menor de 25 min (tarea corta) se coloca como un único bloque de esa duración.
  Los huecos donde no cabe un bloque válido se saltan.
- **FR-014**: El generador MUST NOT colocar bloques de una tarea no vencida después de su
  fecha límite; las tareas vencidas (FR-011) no tienen esta restricción.
- **FR-015**: El sistema MUST mostrar, tras generar, la lista de tareas sin asignar con
  los minutos que no cupieron y el motivo (sin espacio en la semana o sin espacio antes de
  la fecha límite), y MUST marcar visualmente como vencidos los bloques y tareas vencidas.
- **FR-016**: Regenerar una semana MUST eliminar únicamente sus bloques en estado
  planificado y conservar los completados y omitidos, que siguen ocupando su horario.
- **FR-017**: Ante las mismas entradas, el generador MUST producir siempre el mismo
  horario (resultado determinista).

**Vista semanal y seguimiento**

- **FR-018**: El sistema MUST mostrar los bloques de la semana en un calendario de lunes a
  domingo y permitir navegar a la semana anterior y siguiente.
- **FR-019**: Los usuarios MUST poder cambiar el estado de un bloque entre planificado,
  completado y omitido.

**Productividad**

- **FR-020**: El sistema MUST mostrar para la semana seleccionada: % de bloques
  completados (completados / total de bloques de la semana), horas planificadas (suma de
  la duración de todos los bloques de la semana, en cualquier estado) y horas completadas
  (suma de la duración planificada completa de los bloques completados; no se registran
  minutos reales ni avances parciales).
- **FR-021**: El sistema MUST mostrar el número de tareas que pasaron a terminadas
  durante la semana seleccionada.
- **FR-022**: El sistema MUST mostrar la racha actual: días consecutivos con al menos un
  bloque completado, contando hacia atrás desde hoy (o desde ayer si hoy aún no hay
  ninguno).

### Key Entities

- **Usuario**: persona con cuenta; tiene email único y contraseña protegida; es dueño de
  todas las demás entidades.
- **Franja de disponibilidad**: intervalo libre recurrente semanal; día de la semana, hora
  de inicio y hora de fin; pertenece a un usuario.
- **Tarea**: trabajo a planificar; título, duración estimada, prioridad, fecha límite y
  categoría opcionales, estado, fecha de creación y fecha en que se terminó. "Vencida" no
  se almacena: se deriva de que siga pendiente y su fecha límite ya haya pasado.
- **Bloque de horario**: porción de una tarea colocada en una fecha y hora concretas;
  inicio, fin, estado (planificado/completado/omitido); pertenece a una tarea y a un
  usuario.
- **Resultado de generación**: lo que devuelve una generación: bloques creados y lista de
  tareas sin asignar con minutos pendientes y motivo (no se guarda de forma permanente).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario nuevo se registra, define su disponibilidad, crea 5 tareas y
  obtiene su horario semanal en menos de 3 minutos.
- **SC-002**: Generar una semana con 50 tareas pendientes muestra el resultado en menos de
  1 segundo.
- **SC-003**: En el 100 % de las generaciones verificadas, ningún bloque se solapa con
  otro, queda fuera de la disponibilidad o queda después de la fecha límite de su tarea.
- **SC-004**: Las métricas del panel coinciden en el 100 % de los casos de prueba con el
  cálculo manual sobre los mismos datos.
- **SC-005**: En pruebas de acceso cruzado, el 0 % de los intentos de un usuario de leer
  o modificar datos de otro tiene éxito.
- **SC-006**: Al menos 4 de cada 5 usuarios de prueba completan el flujo "generar semana
  y marcar un bloque como completado" sin ayuda en su primer intento.
- **SC-007**: La aplicación está accesible en una URL pública y el flujo completo funciona
  en ella.

## Assumptions

- Usuario individual que planifica su propia semana; no hay roles, equipos ni
  compartición.
- La semana va de lunes a domingo y todas las horas se interpretan en la zona horaria del
  navegador del usuario; no se gestionan múltiples zonas horarias.
- La disponibilidad es la misma todas las semanas (patrón semanal); no hay excepciones por
  fecha concreta en el MVP.
- Los valores del algoritmo (bloques de 25–50 min, descanso de 5 min) son fijos en el
  MVP; el usuario no puede configurarlos.
- Una fecha límite indica el final de ese día (23:59) en la zona horaria del usuario.
- Los bloques omitidos cuentan en el total de bloques del % pero no reducen los minutos
  restantes de la tarea.
- Cambiar franjas o tareas no reprograma automáticamente; el usuario regenera.
- Sin recuperación de contraseña ni verificación de email en el MVP.
- Fuera de alcance: equipos, integración con Google Calendar, notificaciones, IA para
  estimar duraciones, recurrencia de tareas, temporizador y apps móviles nativas (la web
  se usa también desde el navegador del móvil).
