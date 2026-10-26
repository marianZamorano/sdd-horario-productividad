# Contract: availability

Cubre US2, FR-004 y FR-005. Ver las convenciones en [README.md](README.md).

## Tipos

```ts
type AvailabilitySlotDto = {
  id: string;
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1 = lunes … 7 = domingo
  startMinute: number;               // minutos desde 00:00 locales; 18:00 → 1080
  endMinute: number;                 // 22:00 → 1320
};
```

## GET /api/availability

`200 AvailabilitySlotDto[]`, ordenado por `weekday` y luego `startMinute`.

## POST /api/availability

Request: `{ "weekday": 1, "startMinute": 1080, "endMinute": 1320 }`

| Campo | Reglas |
|-------|--------|
| `weekday` | entero 1–7 |
| `startMinute` | entero 0–1425, múltiplo de 15 |
| `endMinute` | entero 15–1440, múltiplo de 15, `> startMinute` |

Responses:

- `201 AvailabilitySlotDto`
- `400` validación (incluye `endMinute <= startMinute`)
- `409 { code: "SLOT_OVERLAP" }` si se solapa con otra franja del mismo día

## PATCH /api/availability/:id

Request: cualquier subconjunto de `{ weekday, startMinute, endMinute }`, con las mismas
reglas. El solape se valida excluyendo la propia franja.

Responses: `200 AvailabilitySlotDto` · `400` · `404` · `409 SLOT_OVERLAP`.

## DELETE /api/availability/:id

Responses: `204` · `404`. No modifica bloques ya generados; el usuario regenera para
aplicar el cambio.
