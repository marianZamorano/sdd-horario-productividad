import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { WeekStatsDto } from './types';

export function useWeekStats(weekStart: string) {
  return useQuery({
    queryKey: ['stats', weekStart],
    queryFn: () => api.get<WeekStatsDto>(`/stats/week?weekStart=${weekStart}`),
  });
}
