import type { ReactNode } from 'react';
import type { ScheduleBlockDto } from '../api/types';
import { WEEKDAYS } from '../lib/weekdays';
import { addDays, zonedParts } from '../lib/zoned';
import { BlockCard } from './BlockCard';

// 1,6 px/min: un bloque mínimo de 25 min mide 40 px y caben título y hora.
const PX_PER_MINUTE = 1.6;
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 20;

interface WeekGridProps {
  weekStart: string;
  timezone: string;
  blocks: ScheduleBlockDto[];
  renderActions?: (block: ScheduleBlockDto) => ReactNode;
}

/** Calendario lunes–domingo; cada bloque se posiciona por su hora local (FR-018). */
export function WeekGrid({ weekStart, timezone, blocks, renderActions }: WeekGridProps) {
  const placed = blocks.map((block) => ({ block, ...zonedParts(block.startAt, timezone) }));

  const startHour = Math.min(
    DEFAULT_START_HOUR,
    ...placed.map((p) => Math.floor(p.minutes / 60)),
  );
  const endHour = Math.max(
    DEFAULT_END_HOUR,
    ...placed.map((p) => Math.ceil((p.minutes + p.block.durationMinutes) / 60)),
  );
  const height = (endHour - startHour) * 60 * PX_PER_MINUTE;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-4xl grid-cols-[3rem_repeat(7,minmax(0,1fr))] gap-1">
        <div />
        {WEEKDAYS.map((day, index) => {
          const date = addDays(weekStart, index);
          const [, month, dayOfMonth] = date.split('-').map(Number);
          return (
            <div key={day.value} className="pb-1 text-center text-sm">
              <h3 id={`day-${day.value}`} className="font-medium">
                {day.label}
              </h3>
              <span className="text-slate-500">{`${dayOfMonth}/${month}`}</span>
            </div>
          );
        })}

        <div className="relative" style={{ height }}>
          {hours.map((hour) => (
            <span
              key={hour}
              className="absolute right-1 -translate-y-1/2 text-xs text-slate-400"
              style={{ top: (hour - startHour) * 60 * PX_PER_MINUTE }}
            >
              {String(hour).padStart(2, '0')}:00
            </span>
          ))}
        </div>

        {WEEKDAYS.map((day, index) => {
          const date = addDays(weekStart, index);
          return (
            <section
              key={day.value}
              aria-labelledby={`day-${day.value}`}
              className="relative rounded border border-slate-200 bg-white"
              style={{ height }}
            >
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-t border-slate-100"
                  style={{ top: (hour - startHour) * 60 * PX_PER_MINUTE }}
                />
              ))}
              {placed
                .filter((p) => p.date === date)
                .map(({ block, minutes }) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    startMinutes={minutes}
                    actions={renderActions?.(block)}
                    style={{
                      position: 'absolute',
                      left: 2,
                      right: 2,
                      top: (minutes - startHour * 60) * PX_PER_MINUTE,
                      height: block.durationMinutes * PX_PER_MINUTE,
                    }}
                  />
                ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
